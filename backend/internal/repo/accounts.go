package repo

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const refreshTTL = 30 * 24 * time.Hour

type Account struct {
	ID           string
	Email        *string
	PasswordHash *string
	GoogleSub    *string
	Name         *string
	AvatarURL    *string
}

type RefreshRecord struct {
	ID        int64
	UserID    string
	Email     *string
	Name      *string
	AvatarURL *string
	ExpiresAt time.Time
	Revoked   bool
}

type Accounts struct {
	db *pgxpool.Pool
}

func NewAccounts(db *pgxpool.Pool) *Accounts {
	return &Accounts{db: db}
}

func scanAccount(row pgx.Row) (Account, error) {
	var a Account
	err := row.Scan(&a.ID, &a.Email, &a.PasswordHash, &a.GoogleSub, &a.Name, &a.AvatarURL)
	return a, err
}

const accountColumns = `id::text, email, password_hash, google_sub, name, avatar_url`

func (r *Accounts) FindByEmail(ctx context.Context, email string) (*Account, error) {
	a, err := scanAccount(r.db.QueryRow(ctx,
		`SELECT `+accountColumns+` FROM users WHERE email = $1`, email))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *Accounts) FindByGoogleSub(ctx context.Context, sub string) (*Account, error) {
	a, err := scanAccount(r.db.QueryRow(ctx,
		`SELECT `+accountColumns+` FROM users WHERE google_sub = $1`, sub))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *Accounts) CreateWithPassword(ctx context.Context, email, passwordHash string) (Account, error) {
	return scanAccount(r.db.QueryRow(ctx,
		`INSERT INTO users (id, email, password_hash) VALUES (gen_random_uuid(), $1, $2)
		 RETURNING `+accountColumns, email, passwordHash))
}

func (r *Accounts) CreateWithGoogle(ctx context.Context, email, googleSub, name, avatarURL string) (Account, error) {
	return scanAccount(r.db.QueryRow(ctx,
		`INSERT INTO users (id, email, google_sub, name, avatar_url)
		 VALUES (gen_random_uuid(), $1, $2, NULLIF($3, ''), NULLIF($4, ''))
		 RETURNING `+accountColumns, email, googleSub, name, avatarURL))
}

// LinkGoogle привязывает google_sub к существующему аккаунту и подтягивает имя
// с аватаром. Вызывается и при каждом повторном входе: ссылка на картинку у
// Google со временем меняется. Пустые значения не затирают то, что уже есть.
func (r *Accounts) LinkGoogle(ctx context.Context, userID, googleSub, name, avatarURL string) (Account, error) {
	return scanAccount(r.db.QueryRow(ctx,
		`UPDATE users SET
		   google_sub = $2,
		   name = COALESCE(NULLIF($3, ''), name),
		   avatar_url = COALESCE(NULLIF($4, ''), avatar_url)
		 WHERE id = $1
		 RETURNING `+accountColumns, userID, googleSub, name, avatarURL))
}

func (r *Accounts) SetPasswordHash(ctx context.Context, userID, passwordHash string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET password_hash = $2 WHERE id = $1`, userID, passwordHash)
	return err
}

// NewRefreshToken returns the raw cookie value and its sha256 hash for storage.
func NewRefreshToken() (raw string, hash []byte, err error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", nil, err
	}
	sum := sha256.Sum256(buf)
	return base64.RawURLEncoding.EncodeToString(buf), sum[:], nil
}

func HashRefreshToken(raw string) ([]byte, error) {
	buf, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return nil, err
	}
	sum := sha256.Sum256(buf)
	return sum[:], nil
}

func (r *Accounts) InsertRefresh(ctx context.Context, userID string, hash []byte) (time.Time, error) {
	expires := time.Now().Add(refreshTTL)
	_, err := r.db.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, hash, expires)
	return expires, err
}

func (r *Accounts) GetRefresh(ctx context.Context, hash []byte) (*RefreshRecord, error) {
	var rec RefreshRecord
	var revokedAt *time.Time
	err := r.db.QueryRow(ctx,
		`SELECT rt.id, rt.user_id::text, u.email, u.name, u.avatar_url, rt.expires_at, rt.revoked_at
		 FROM refresh_tokens rt
		 JOIN users u ON u.id = rt.user_id
		 WHERE rt.token_hash = $1`, hash).Scan(
		&rec.ID, &rec.UserID, &rec.Email, &rec.Name, &rec.AvatarURL, &rec.ExpiresAt, &revokedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	rec.Revoked = revokedAt != nil
	return &rec, nil
}

func (r *Accounts) RevokeRefresh(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx,
		`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, id)
	return err
}

// RotateRefresh revokes the current token and inserts a new one in one transaction.
func (r *Accounts) RotateRefresh(ctx context.Context, oldID int64, userID string, newHash []byte) (time.Time, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return time.Time{}, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, oldID); err != nil {
		return time.Time{}, err
	}
	expires := time.Now().Add(refreshTTL)
	if _, err := tx.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, newHash, expires); err != nil {
		return time.Time{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return time.Time{}, err
	}
	return expires, nil
}
