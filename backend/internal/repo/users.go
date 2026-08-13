package repo

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const userColumns = `id::text, "createdAt", "updatedAt", "caloriesGoal", "proteinGoal", weight, height, age, gender, "activityLevel", goal`

type Users struct {
	db *pgxpool.Pool
}

func NewUsers(db *pgxpool.Pool) *Users {
	return &Users{db: db}
}

func scanUser(row pgx.Row) (User, error) {
	var u User
	err := row.Scan(
		&u.ID, &u.CreatedAt, &u.UpdatedAt, &u.CaloriesGoal, &u.ProteinGoal,
		&u.Weight, &u.Height, &u.Age, &u.Gender, &u.ActivityLevel, &u.Goal,
	)
	return u, err
}

// GetOrCreate provisions the profile row on first access. On Supabase this
// was done by the handle_new_user trigger on auth.users; upsert-on-read keeps
// working after the database moves off Supabase (Phase 2).
func (r *Users) GetOrCreate(ctx context.Context, userID string) (User, error) {
	if _, err := r.db.Exec(ctx,
		`INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, userID); err != nil {
		return User{}, err
	}
	return scanUser(r.db.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE id = $1`, userID))
}

func (r *Users) UpsertGoals(ctx context.Context, userID string, caloriesGoal, proteinGoal int) (User, error) {
	return scanUser(r.db.QueryRow(ctx,
		`INSERT INTO users (id, "caloriesGoal", "proteinGoal") VALUES ($1, $2, $3)
		 ON CONFLICT (id) DO UPDATE SET "caloriesGoal" = EXCLUDED."caloriesGoal", "proteinGoal" = EXCLUDED."proteinGoal"
		 RETURNING `+userColumns,
		userID, caloriesGoal, proteinGoal))
}

func (r *Users) UpdateParams(ctx context.Context, userID string, in UserParamsInput) (User, error) {
	cols := []string{}
	vals := []any{}
	add := func(col string, val any) {
		cols = append(cols, col)
		vals = append(vals, val)
	}
	if in.CaloriesGoal != nil {
		add(`"caloriesGoal"`, *in.CaloriesGoal)
	}
	if in.ProteinGoal != nil {
		add(`"proteinGoal"`, *in.ProteinGoal)
	}
	if in.Weight != nil {
		add(`weight`, *in.Weight)
	}
	if in.Height != nil {
		add(`height`, *in.Height)
	}
	if in.Age != nil {
		add(`age`, *in.Age)
	}
	if in.Gender != nil {
		add(`gender`, *in.Gender)
	}
	if in.ActivityLevel != nil {
		add(`"activityLevel"`, *in.ActivityLevel)
	}
	if in.Goal != nil {
		add(`goal`, *in.Goal)
	}

	if len(cols) == 0 {
		return r.GetOrCreate(ctx, userID)
	}

	sets := make([]string, len(cols))
	for i, col := range cols {
		sets[i] = fmt.Sprintf("%s = $%d", col, i+1)
	}
	query := fmt.Sprintf(
		`UPDATE users SET %s WHERE id = $%d RETURNING %s`,
		strings.Join(sets, ", "), len(vals)+1, userColumns,
	)
	vals = append(vals, userID)

	u, err := scanUser(r.db.QueryRow(ctx, query, vals...))
	if errors.Is(err, pgx.ErrNoRows) {
		// Row not provisioned yet: create it, then retry the update once.
		if _, err := r.GetOrCreate(ctx, userID); err != nil {
			return User{}, err
		}
		return scanUser(r.db.QueryRow(ctx, query, vals...))
	}
	return u, err
}
