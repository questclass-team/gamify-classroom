# 📋 Raport ze spotkania – Sprint Review, Sprint 2

| | |
|---|---|
| **Data** | 25.11.2026 |
| **Miejsce** | Laboratorium, WMiI UAM |
| **Sprint** | 18.11.2026 – 25.11.2026 |
| **Product Owner** | Artem Isianov |
| **Scrum Master** | Kiryl Kavaliou |
| **Deweloperzy** | Mykyta Kyslytsia, Piotr Codogni, Kajetan Muczyński, Kiryl Kavaliou |

## 🎯 Cel spotkania

Przedstawienie Product Ownerowi przyrostu ze sprintu 2, odbiór user stories i decyzja, co przechodzi do sprintu 3.

## 🏁 Cel sprintu

> Nauczyciel przyznaje studentom punkty i odznaki, a student ustawia nick i awatar oraz widzi swoje saldo, rangę, odznaki i miejsce w rankingu grupy.

Cel sprintu został osiągnięty.

## 📌 Odbiór user stories

| Klucz | User story | Wynik |
|---|---|---|
| SCRUM-10 | Przyznawanie punktów i odznak | ✅ przyjęta funkcjonalnie; testy SCRUM-35 przechodzą do sprintu 3 |
| SCRUM-11 | Profil, postępy i ranking | ✅ przyjęta |

## 🧩 Przyrost

| Obszar | Co zostało dostarczone | Pull requesty |
|---|---|---|
| Serwis game – Piotr | przyznawanie punktów z uzasadnieniem, saldo i postęp studenta; odznaki grupy: tworzenie, lista, przyznawanie i cofanie | #24, #25, #26 |
| Serwis core – Kiryl | nicki studentów (unikalne bez względu na wielkość liter), grupy studenta, skład grupy, awatary z gotowego zestawu | #27, #32 |
| Serwis game – Mykyta | stan studenta w grupie i ranking według nicków (punkty albo odznaki), awatar w stanie i w rankingu | #28, #34 |
| Frontend – Mykyta | widok nagród z historią; widoki studenta: moje grupy, mój stan, ranking, nick i awatar; wygląd Blask w całej aplikacji; README, ikona strony | #29, #30, #31, #33, #35, #36 |
| Środowisko – Kajetan | aktualizacje zależności w CI i obrazach Dockera | #11, #38 |

## 💬 Omówione tematy

- **Zadania dodane w trakcie sprintu** – SCRUM-39 (wygląd Blask), SCRUM-54 i SCRUM-55: core zapisuje tylko klucz awatara, więc do działającej funkcji trzeba było przekazać go przez serwis game i dodać wybór we frontendzie.
- **Prywatność** – ranking pokazuje wyłącznie nicki i awatary z gotowego zestawu, bez imion, loginów i zdjęć; sprawdzone testami i scenariuszem end-to-end na Docker Compose.
- **Prototyp w Figmie** – zadanie z laboratorium 6: ścieżka przyznania nagrody z logowaniem i stanami błędu, link przesłany w Moodle.

## ⚠️ Problemy i ryzyka

- **SCRUM-35 niezrealizowane** – testy salda, rang i historii nie były w podziale pracy na planowaniu, więc SCRUM-10 nie może jeszcze przejść do *Completed*.
- **Nierówne obciążenie** – większość zadań frontendu i części game trafiła do jednej osoby; w sprincie 3 dzielimy pracę równiej.
- **Statusy w Jirze** – część zadań stała w *To Do* lub *Testing* mimo scalonych PR; statusy aktualizujemy zaraz po scaleniu.

## ✅ Ustalenia

- SCRUM-11 jest zamknięta – Product Owner przenosi ją do *Completed*.
- SCRUM-32, SCRUM-33 i SCRUM-34 przechodzą do *Completed*; SCRUM-35 przechodzi do sprintu 3, a SCRUM-10 zamykamy po nim.
- Zakres KM1 (epik SCRUM-5) jest gotowy – po zamknięciu SCRUM-10 oznaczamy `main` tagiem `v0.1`.
- W sprincie 3 Scrum Masterem jest Mykyta (rotacja ról ustalona w sprincie 1).
