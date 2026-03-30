# Family Trip Organizer 🏕️

A static, beginner-friendly family trip organizer hosted on GitHub Pages and backed by Firebase Realtime Database.

## Tabs

1. **Packing**
   - Add, edit, delete items
   - Family assignment/checking
   - Category chips and search
2. **Trip Info**
   - Shared location, address, maps link, timings, booking details, notes
3. **Schedule**
   - Shared event list with title/date/time/notes/added-by
4. **Essentials**
   - Grouped reminders for before departure, on arrival, before return
5. **Expenses**
   - Shared expenses, totals by family, and simple settlement summary

## File structure

- `index.html` – shell layout and modal container
- `styles.css` – global styles and mobile UX
- `app.js` – app bootstrap + top-level tab navigation
- `firebase.js` – Firebase setup + CRUD helpers + packing migration
- `tabs/`
  - `packing.js`
  - `tripInfo.js`
  - `schedule.js`
  - `essentials.js`
  - `expenses.js`
- `components/`
  - `modal.js`
  - `toast.js`
- `utils/`
  - `constants.js`
  - `defaultItems.js`
  - `settlement.js`

## Firebase data structure (recommended and used)

```json
{
  "packing": {
    "items": {
      "<itemId>": {
        "name": "Sunscreen",
        "category": "Health",
        "qty": "2 bottles",
        "note": "",
        "updatedAt": 1710000000000
      }
    },
    "checks": {
      "<itemId>": {
        "kk_vasu": true,
        "sridhar_vaishu": false,
        "veera_durga": true
      }
    }
  },
  "tripInfo": { "locationName": "", "address": "", "mapsUrl": "" },
  "schedule": { "<eventId>": { "title": "", "date": "", "time": "", "notes": "", "addedBy": "kk_vasu" } },
  "essentials": {
    "beforeDeparture": {},
    "onArrival": {},
    "beforeReturn": {}
  },
  "expenses": {
    "entries": {
      "<expenseId>": {
        "title": "Groceries",
        "amount": 42.5,
        "paidBy": "kk_vasu",
        "sharedWith": ["kk_vasu", "sridhar_vaishu", "veera_durga"],
        "category": "Food",
        "date": "2026-03-30",
        "notes": ""
      }
    }
  }
}
```

## Migration behavior

On startup, the app checks `packing/items`:
- If new packing data exists, it uses it directly.
- If not, it migrates legacy `items` + `checks` into the new `packing/*` structure.
- If legacy data is also empty, it seeds a lightweight default packing list.

## Run locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages deploy

No build step required. Publish directly from repository root.

## Phase status

- ✅ Phase 1: Existing code analyzed, target data model and file structure defined.
- ✅ Phase 2: App refactored into modular multi-file architecture.
- ✅ Phase 3: Tab navigation and Trip Info tab implemented.
- ✅ Phase 4: Schedule and Essentials tabs implemented.
- ✅ Phase 5: Expenses tab and settlement logic implemented.
- ✅ Phase 6: Mobile-first styling improvements and documentation updates completed.
