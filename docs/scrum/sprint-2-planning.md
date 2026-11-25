# 📋 Raport ze spotkania – Sprint Planning, Sprint 2

| | |
|---|---|
| **Data** | 18.11.2026 |
| **Miejsce** | Laboratorium, WMiI UAM |
| **Sprint** | 18.11.2026 – 25.11.2026 |
| **Product Owner** | Artem Isianov |
| **Scrum Master** | Mykyta Kyslytsia |
| **Deweloperzy** | Mykyta Kyslytsia, Piotr Codogni, Kajetan Muczyński, Kiryl Kavaliou |

## 🎯 Cel spotkania

Wybór user stories do drugiego sprintu i podział zadań. Planowanie odbyło się zaraz po przeglądzie sprintu 1 ([raport](sprint-1-review.md)).

## 🏁 Cel sprintu

> Nauczyciel przyznaje studentom punkty i odznaki, a student ustawia nick i awatar oraz widzi swoje saldo, rangę, odznaki i miejsce w rankingu grupy.

## 📌 Wybrane user stories

| Klucz | User story | Wymagania |
|---|---|---|
| SCRUM-10 | Przyznawanie punktów i odznak | FR-11, FR-12, FR-14, FR-15, FR-17 |
| SCRUM-11 | Profil, postępy i ranking | FR-21, FR-22, FR-23 |

## 👥 Podział pracy

| Zadanie | Serwis | Zakres | Osoba |
|---|---|---|---|
| SCRUM-32 | game | przyznawanie punktów z uzasadnieniem, saldo i postęp studenta | Piotr |
| SCRUM-33 | game | odznaki grupy: tworzenie i przyznawanie | Piotr |
| SCRUM-34 | frontend | widok nagród z historią | Mykyta |
| SCRUM-36 | core | nick i awatar w profilu studenta | Kiryl |
| SCRUM-37 | game | stan studenta w grupie i ranking według nicków | Mykyta |
| SCRUM-38 | frontend | widoki studenta: moje grupy, stan w grupie, ranking | Mykyta |

## 💬 Omówione tematy

- **Zakres sprintu** – SCRUM-10 przechodzi ze sprintu 1, jak ustaliliśmy na poprzednim planowaniu; razem z nim zamykamy epik SCRUM-5, czyli zakres kamienia milowego KM1 (koniec listopada). SCRUM-11 otwiera epik SCRUM-6 – część dla studenta.
- **Prywatność studentów** – ranking pokazuje wyłącznie nicki, nigdy imion i nazwisk, a student widzi tylko swoje dane i rankingi swoich grup (kryteria akceptacji SCRUM-11).
- **Zasady pracy** – bez zmian: zadanie przechodzi do *Testing* po otwarciu PR, a do *Completed* przenosi je wyłącznie Product Owner.

## ⚠️ Problemy i ryzyka

- **Termin KM1** – to ostatni sprint przed kamieniem milowym KM1, więc SCRUM-10 musi być gotowy na przegląd 25.11.
- **Zależność między serwisami** – stan studenta i ranking w serwisie game biorą nicki z listy uczestników grupy w core, więc część core z SCRUM-36 trzeba scalić jako pierwszą.

## ✅ Ustalenia

- Sprint trwa od **18.11** do **25.11.2026**.
- Przegląd i odbiór przyrostu przez Product Ownera na kolejnych zajęciach (**25.11.2026**).
