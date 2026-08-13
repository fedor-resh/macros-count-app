package repo

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Products struct {
	db *pgxpool.Pool
}

func NewProducts(db *pgxpool.Pool) *Products {
	return &Products{db: db}
}

func (r *Products) Search(ctx context.Context, search string, limit int) ([]Product, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, created_at, updated_at, name, brand, unit, serving_value, kcalories, protein, fat, carbs
		 FROM products
		 WHERE name ILIKE '%' || $1 || '%'
		 LIMIT $2`,
		search, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Product{}
	for rows.Next() {
		var p Product
		if err := rows.Scan(
			&p.ID, &p.CreatedAt, &p.UpdatedAt, &p.Name, &p.Brand, &p.Unit,
			&p.ServingValue, &p.Kcalories, &p.Protein, &p.Fat, &p.Carbs,
		); err != nil {
			return nil, err
		}
		items = append(items, p)
	}
	return items, rows.Err()
}
