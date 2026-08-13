package repo

import "time"

// JSON tags match the column names the frontend types in
// src/types/database.types.ts expect: eaten_products and users use quoted
// camelCase columns, products is snake_case.

type EatenProduct struct {
	ID        int64     `json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	Date      *string   `json:"date"`
	ImageURL  *string   `json:"imageUrl"`
	Kcalories *int64    `json:"kcalories"`
	Name      string    `json:"name"`
	Protein   *int64    `json:"protein"`
	Status    string    `json:"status"`
	Unit      *string   `json:"unit"`
	UserID    *string   `json:"userId"`
	Value     *float64  `json:"value"`
}

// EatenProductInput carries client-writable fields. userId is deliberately
// absent: it always comes from the authenticated context, never the payload.
type EatenProductInput struct {
	Name      *string  `json:"name"`
	Unit      *string  `json:"unit"`
	Date      *string  `json:"date"`
	Kcalories *int64   `json:"kcalories"`
	Protein   *int64   `json:"protein"`
	Value     *float64 `json:"value"`
	ImageURL  *string  `json:"imageUrl"`
	Status    *string  `json:"status"`
}

type Product struct {
	ID           int64      `json:"id"`
	CreatedAt    *time.Time `json:"created_at"`
	UpdatedAt    *time.Time `json:"updated_at"`
	Name         string     `json:"name"`
	Brand        *string    `json:"brand"`
	Unit         *string    `json:"unit"`
	ServingValue *float64   `json:"serving_value"`
	Kcalories    *float64   `json:"kcalories"`
	Protein      *float64   `json:"protein"`
	Fat          *float64   `json:"fat"`
	Carbs        *float64   `json:"carbs"`
}

type User struct {
	ID            string    `json:"id"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	CaloriesGoal  int       `json:"caloriesGoal"`
	ProteinGoal   int       `json:"proteinGoal"`
	Weight        *float64  `json:"weight"`
	Height        *float64  `json:"height"`
	Age           *int      `json:"age"`
	Gender        *string   `json:"gender"`
	ActivityLevel *string   `json:"activityLevel"`
	Goal          *string   `json:"goal"`
}

type UserParamsInput struct {
	CaloriesGoal  *int     `json:"caloriesGoal"`
	ProteinGoal   *int     `json:"proteinGoal"`
	Weight        *float64 `json:"weight"`
	Height        *float64 `json:"height"`
	Age           *int     `json:"age"`
	Gender        *string  `json:"gender"`
	ActivityLevel *string  `json:"activityLevel"`
	Goal          *string  `json:"goal"`
}
