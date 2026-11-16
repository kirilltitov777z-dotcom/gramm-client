# Реестр баннеров ГРАММ

Публичный JSON, который клиент читает, чтобы показать фон профиля другим пользователям ГРАММ.

Формат:

```json
{
  "abc123": {
    "image": "https://example.com/banner.jpg",
    "gradient": "linear-gradient(135deg,#4facfe,#6c5ce7)",
    "caption": "Мой фон",
    "v": 1
  }
}
```

Ключ — short id из маркера в `bio` (`⟦g:abc123⟧`). Обновляется через workflow
`.github/workflows/publish-banner.yml` (repository_dispatch) или вручную PR.
