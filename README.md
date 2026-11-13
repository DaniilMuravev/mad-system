# Mad System

Статичный сайт, сборка не нужна. Все библиотеки и шрифты лежат внутри, интернет для работы не требуется.

## Залить (Windows, PowerShell)

```
git clone https://github.com/DaniilMuravev/mad-system.git
cd mad-system
# скопируй сюда содержимое архива с заменой
git add .
git commit -m "v3"
git push
```

Vercel: Add New → Project → Import `mad-system` → Framework Preset: Other → Deploy.
Дальше каждый `git push` обновляет сайт сам.

## Где что лежит

- `index.html` тексты RU/EN в атрибутах `data-ru` / `data-en`
- `js/main.js` реплики парня на входе (`SAY`), слова (`WORDS`), подписи комикса (`PAGES`), тайминг ролика (`initFilm`)
- `css/style.css` цвета `--cream`, `--ink`; шрифты в `html[data-font]`
- `assets/guy` позы, `assets/ink` вещи тушью, `assets/rot` 25 кадров поворота кармана,
  `assets/film` шаги шорт и футболки, `assets/pockets` эскизы карманов, `assets/photo` реальные вещи

