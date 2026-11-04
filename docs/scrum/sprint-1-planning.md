# 📋 Raport ze spotkania – Sprint Planning, Sprint 1

| | |
|---|---|
| **Data** | 04.11.2026 |
| **Miejsce** | Laboratorium, WMiI UAM |
| **Sprint** | 04.11.2026 – 11.11.2026 |
| **Product Owner** | Artem Isianov |
| **Scrum Master** | Kiryl Kavaliou |
| **Deweloperzy** | Mykyta Kyslytsia, Piotr Codogni, Kajetan Muczyński, Kiryl Kavaliou |

## 🎯 Cel spotkania

Wybór user stories do pierwszego sprintu, podział zadań i ustalenie ról w zespole.

## 🏁 Cel sprintu

> Nauczyciel może zalogować się kontem LABS, utworzyć grupę ze studentami i skonfigurować punkty oraz rangi; działa środowisko Docker z testowym LDAP i CI.

## 📌 Wybrane user stories

| Klucz | User story | Zadania |
|---|---|---|
| SCRUM-7 | Konta użytkowników i logowanie | 8 |
| SCRUM-8 | Tworzenie grup zajęciowych i zarządzanie uczestnikami | 5 |
| SCRUM-9 | Konfiguracja punktów i rang | 4 |

## 👥 Podział pracy

| Osoba | Rola | Zakres | Zadania |
|---|---|---|---|
| Kiryl | Scrum Master, deweloper | backend serwisu core: logowanie LDAP, JWT, import CSV, API grup | 4 |
| Piotr | deweloper | backend serwisu game: modele i API konfiguracji, weryfikacja JWT, testy | 4 |
| Mykyta | deweloper | frontend: logowanie, panel administratora, widoki grup i konfiguracji | 5 |
| Kajetan | deweloper | Docker Compose, testowy LDAP, CI, testy | 4 |
| Artem | Product Owner | backlog, kontakt z klientem, odbiór przyrostu | – |

## 💬 Omówione tematy

- **Zakres sprintu** – zamiast czterech stories wybraliśmy trzy, bo w pierwszym tygodniu trzeba też przygotować środowisko (Docker, CI) i szkielety obu serwisów. SCRUM-10 przechodzi do sprintu 2.
- **Rotacja ról** – w kolejnych sprintach zmieniamy role tak, aby każdy był co najmniej raz Product Ownerem i raz Scrum Masterem.
- **Zasady pracy** – gałęzie z kluczem zadania (np. `feature/SCRUM-25-...`), pull request z jednym zatwierdzeniem; zadanie przechodzi do *Testing* po otwarciu PR, a do *Completed* przenosi je wyłącznie Product Owner.

## ⚠️ Problemy i ryzyka

- **Brak dostępu do produkcyjnego LDAP** – pracujemy na testowym OpenLDAP w Dockerze.
- **Dużo zadań konfiguracyjnych w pierwszym tygodniu** – priorytet ma środowisko, bo blokuje pozostałe zadania.

## ✅ Ustalenia

- Sprint trwa od **04.11** do **11.11.2026**.
- Review i odbiór przyrostu przez Product Ownera na kolejnych zajęciach (**11.11.2026**).
