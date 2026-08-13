package repo

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const eatenProductColumns = `id, "createdAt", "date"::text, "imageUrl", kcalories, name, protein, status, unit, "userId"::text, value`

type EatenProducts struct {
	db *pgxpool.Pool
}

func NewEatenProducts(db *pgxpool.Pool) *EatenProducts {
	return &EatenProducts{db: db}
}

func scanEatenProduct(row pgx.Row) (EatenProduct, error) {
	var p EatenProduct
	err := row.Scan(
		&p.ID, &p.CreatedAt, &p.Date, &p.ImageURL, &p.Kcalories,
		&p.Name, &p.Protein, &p.Status, &p.Unit, &p.UserID, &p.Value,
	)
	return p, err
}

func (r *EatenProducts) collect(ctx context.Context, query string, args ...any) ([]EatenProduct, error) {
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []EatenProduct{}
	for rows.Next() {
		p, err := scanEatenProduct(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, p)
	}
	return items, rows.Err()
}

func (r *EatenProducts) ListInRange(ctx context.Context, userID, from, to string) ([]EatenProduct, error) {
	return r.collect(ctx,
		`SELECT `+eatenProductColumns+` FROM eaten_products
		 WHERE "userId" = $1 AND "date" >= $2 AND "date" <= $3
		 ORDER BY "createdAt" DESC`,
		userID, from, to)
}

func (r *EatenProducts) ListHistory(ctx context.Context, userID, search string, limit int) ([]EatenProduct, error) {
	if search != "" {
		return r.collect(ctx,
			`SELECT `+eatenProductColumns+` FROM eaten_products
			 WHERE "userId" = $1 AND name ILIKE '%' || $2 || '%'
			 ORDER BY "createdAt" DESC LIMIT $3`,
			userID, search, limit)
	}
	return r.collect(ctx,
		`SELECT `+eatenProductColumns+` FROM eaten_products
		 WHERE "userId" = $1
		 ORDER BY "createdAt" DESC LIMIT $2`,
		userID, limit)
}

// writableFields maps provided input fields to their SQL column names.
// Column defaults (name 'Продукт', status 'completed') apply when omitted.
func writableFields(in EatenProductInput) (cols []string, vals []any) {
	add := func(col string, val any) {
		cols = append(cols, col)
		vals = append(vals, val)
	}
	if in.Name != nil {
		add(`name`, *in.Name)
	}
	if in.Unit != nil {
		add(`unit`, *in.Unit)
	}
	if in.Date != nil {
		add(`"date"`, *in.Date)
	}
	if in.Kcalories != nil {
		add(`kcalories`, *in.Kcalories)
	}
	if in.Protein != nil {
		add(`protein`, *in.Protein)
	}
	if in.Value != nil {
		add(`value`, *in.Value)
	}
	if in.ImageURL != nil {
		add(`"imageUrl"`, *in.ImageURL)
	}
	if in.Status != nil {
		add(`status`, *in.Status)
	}
	return cols, vals
}

func (r *EatenProducts) Insert(ctx context.Context, userID string, in EatenProductInput) (EatenProduct, error) {
	cols, vals := writableFields(in)
	cols = append(cols, `"userId"`)
	vals = append(vals, userID)

	placeholders := make([]string, len(vals))
	for i := range vals {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}

	query := fmt.Sprintf(
		`INSERT INTO eaten_products (%s) VALUES (%s) RETURNING %s`,
		strings.Join(cols, ", "), strings.Join(placeholders, ", "), eatenProductColumns,
	)
	return scanEatenProduct(r.db.QueryRow(ctx, query, vals...))
}

// Update patches the provided fields. Returns nil when no row belongs to
// userID with that id — the ownership check that replaces RLS.
func (r *EatenProducts) Update(ctx context.Context, userID string, id int64, in EatenProductInput) (*EatenProduct, error) {
	cols, vals := writableFields(in)

	var query string
	if len(cols) == 0 {
		query = `SELECT ` + eatenProductColumns + ` FROM eaten_products WHERE id = $1 AND "userId" = $2`
		vals = []any{id, userID}
	} else {
		sets := make([]string, len(cols))
		for i, col := range cols {
			sets[i] = fmt.Sprintf("%s = $%d", col, i+1)
		}
		query = fmt.Sprintf(
			`UPDATE eaten_products SET %s WHERE id = $%d AND "userId" = $%d RETURNING %s`,
			strings.Join(sets, ", "), len(vals)+1, len(vals)+2, eatenProductColumns,
		)
		vals = append(vals, id, userID)
	}

	p, err := scanEatenProduct(r.db.QueryRow(ctx, query, vals...))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *EatenProducts) Delete(ctx context.Context, userID string, id int64) (*EatenProduct, error) {
	p, err := scanEatenProduct(r.db.QueryRow(ctx,
		`DELETE FROM eaten_products WHERE id = $1 AND "userId" = $2 RETURNING `+eatenProductColumns,
		id, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// InsertPending creates the placeholder row for an uploaded photo, matching
// preparePendingEatenProductData from the edge function.
func (r *EatenProducts) InsertPending(ctx context.Context, userID, date, imageURL string) (int64, error) {
	var id int64
	err := r.db.QueryRow(ctx,
		`INSERT INTO eaten_products (name, unit, "date", "userId", "imageUrl", status)
		 VALUES ('Продукт', 'г', $1, $2, $3, 'pending') RETURNING id`,
		date, userID, imageURL).Scan(&id)
	return id, err
}

// UpdateAnalysis writes the LLM result and flips status to completed,
// matching updateEatenProductAnalysis from the edge function.
func (r *EatenProducts) UpdateAnalysis(ctx context.Context, id int64, userID, name string, kcalories, protein *int64, value *float64) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE eaten_products SET
			status = 'completed',
			name = $1,
			kcalories = COALESCE($2, kcalories),
			protein = COALESCE($3, protein),
			value = COALESCE($4, value)
		 WHERE id = $5 AND "userId" = $6`,
		name, kcalories, protein, value, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("eaten_products row %d not found for user", id)
	}
	return nil
}

func (r *EatenProducts) UpdateStatus(ctx context.Context, id int64, userID, status string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE eaten_products SET status = $1 WHERE id = $2 AND "userId" = $3`,
		status, id, userID)
	return err
}
