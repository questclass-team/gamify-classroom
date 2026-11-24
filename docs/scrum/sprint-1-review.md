# 📋 Raport ze spotkania – Sprint Review, Sprint 1

| | |
|---|---|
| **Data** | 18.11.2026 |
| **Miejsce** | Laboratorium, WMiI UAM |
| **Sprint** | 04.11.2026 – 18.11.2026 |
| **Product Owner** | Artem Isianov |
| **Scrum Master** | Kiryl Kavaliou |
| **Deweloperzy** | Mykyta Kyslytsia, Piotr Codogni, Kajetan Muczyński, Kiryl Kavaliou |

## 🎯 Cel spotkania

Przedstawienie Product Ownerowi przyrostu ze sprintu 1, odbiór user stories i decyzja, co przechodzi do sprintu 2.

## 🏁 Cel sprintu

> Nauczyciel może zalogować się kontem LABS, utworzyć grupę ze studentami i skonfigurować punkty oraz rangi; działa środowisko Docker z testowym LDAP i CI.

Cel sprintu został osiągnięty.

## 📌 Odbiór user stories

| Klucz | User story | Wynik |
|---|---|---|
| SCRUM-7 | Konta użytkowników i logowanie | ✅ przyjęta |
| SCRUM-8 | Tworzenie grup zajęciowych i zarządzanie uczestnikami | ✅ przyjęta |
| SCRUM-9 | Konfiguracja punktów i rang | ✅ przyjęta |

## 🧩 Przyrost

| Obszar | Co zostało dostarczone | Pull requesty |
|---|---|---|
| Serwis core – Kiryl | logowanie kontem LABS przez LDAP, tokeny JWT z odświeżaniem sesji i wylogowaniem, import kont z pliku CSV z raportem pominiętych wierszy, grupy zajęciowe (tworzenie, lista grup nauczyciela, wyszukiwanie studentów, dodawanie i usuwanie ich z grupy), core w Docker Compose | #12, #14, #15, #17, #18, #20, #21, #22 |
| Serwis game – Piotr | weryfikacja tokenów wydanych przez core, model i API konfiguracji grupy (waluta z ikoną, rangi z progami), automatyczne migracje | #13, #16, #23 |
| Frontend – Mykyta | logowanie, import kont, lista grup, strona grupy z zarządzaniem studentami, konfiguracja punktów i rang; szkielet repozytorium i zasady pracy (`CONTRIBUTING.md`) | #2, #3, #4, #5 |
| Środowisko – Kajetan | Docker Compose z PostgreSQL, testowym OpenLDAP i nginx; CI w GitHub Actions dla każdego pull requesta, test dymny całego stosu, kontrola migracji | #7, #8, #10 |

## 💬 Omówione tematy

- **Termin przeglądu** – przegląd zaplanowany na 11.11 odbył się na kolejnych zajęciach, bo 11.11 to Narodowe Święto Niepodległości i zajęć nie było. Sprint 1 trwał przez to dwa tygodnie.
- **Odbiór przyrostu** – Product Owner przyjął wszystkie trzy user stories bez uwag; nic nie przechodzi do sprintu 2.

## ⚠️ Problemy i ryzyka

- **Produkcyjny LDAP** – dostęp do LDAP wydziału nadal wymaga zgody; do tego czasu pracujemy na testowym OpenLDAP w Dockerze.

## ✅ Ustalenia

- SCRUM-7, SCRUM-8 i SCRUM-9 są zamknięte – Product Owner przenosi je do *Completed*.
- Zaraz po przeglądzie zaplanowaliśmy sprint 2 – zob. [raport z planowania sprintu 2](sprint-2-planning.md).
