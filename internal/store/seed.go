package store

import (
	"context"
	"database/sql"
	"errors"

	"github.com/mrkiz-git/kanba-go/internal/domain"
)

func SeedAdmin(ctx context.Context, users *UserStore, email, passwordHash, name string) error {
	_, _, err := users.GetByEmail(ctx, email)
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	_, err = users.Create(ctx, email, passwordHash, name, domain.RoleAdmin)
	return err
}
