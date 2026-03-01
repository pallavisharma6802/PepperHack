# MadisonBites

## Inspiration

We've all been there. You sit down at a new spot in Madison, the server 
hands you a menu, and you're completely lost. Just dish names and prices. 
No photos, no context, no idea what anything actually looks like or whether 
the regulars think it's worth ordering. So you do what everyone does. You 
pull out your phone and start googling. Dish by dish. Yelp tab by Yelp tab. 
Running macros in a separate app. By the time you figure out what to order 
you've been on your phone for ten minutes and your friends are ready to leave.

For anyone eating with intention — tracking macros, managing allergies, or 
just trying not to order something that looks nothing like you imagined — the 
whole restaurant experience feels way more complicated than it should be. The 
information exists everywhere. It's just never there at the moment you 
actually need it.

That's what MadisonBites is trying to fix.


## What It Does

MadisonBites turns any restaurant menu into a full visual dining experience 
in seconds. Open the app, pick a restaurant off a live Madison map, and 
either scan a physical menu with your camera or let the app automatically 
pull the menu from the restaurant's website.

From a single scan, you get:

* Real food photos for every dish on the menu
* Must try picks sourced from actual Google reviews and Reddit
* Full macro breakdown: calories, protein, carbs, fat per dish
* Allergen flags for Gluten, Dairy, Nuts, Eggs, Shellfish, and Soy
* Everything streamed live to your screen as each agent finishes, not all at once

Tap any dish and a card springs up from the bottom of the screen showing 
the photo, the macros, the review quote that made it a must try, and allergen 
pills that turn red if they match your active filters. Toggle No Gluten and 
every dish on the list responds instantly without a reload.


## How We Built It

The flow from scan to screen:
```
Camera scan OR Restaurant website
            |
     FastAPI backend
            |
   4 agents run in parallel
            |
   Scanner    >> extracts all dishes
   Photos     >> finds real food images  
   Reviews    >> surfaces must try picks
   Nutrition  >> estimates macros and allergens
            |
   SSE stream >> dishes appear one by one
            |
       React PWA on your phone
```

| Layer | Tool | Why |
|---|---|---|
| Frontend | React + Vite | Fast, component reuse, PWA ready |
| Animations | Framer Motion | Physics spring, drag to dismiss |
| Sound | Howler.js | Lightweight, 3 lines per sound event |
| Backend | Python FastAPI | Async SSE streaming |
| AI Agents | Gemini 2.5 Flash | Vision, reasoning, search |
| Restaurant Data | Google Places API | All Madison restaurants |
| Dish Photos | Serper.dev | Real food images via Google Search |
| Menu Scraping | Firecrawl | Renders JS heavy restaurant sites |
| State | Zustand | Global allergen and dish state |
| Deploy | Vercel + Cloud Run | Frontend and backend separately |

One of the best decisions we made early was locking down a shared Pydantic 
schema before anyone wrote a line of agent code. Every field, every type, 
every enum agreed on upfront. It meant four people could build in parallel 
without blocking each other or mismatching data shapes at integration time.


## Challenges We Ran Into

| Challenge | What Happened | How We Fixed It |
|---|---|---|
| Google Custom Search API | Closed to new customers, kept returning 403 errors no matter what we tried | Pivoted to Serper.dev which gave us the same Google Image results with a working API and 2500 free queries |
| JS rendered restaurant websites | Plain HTTP fetch returned empty content on most modern restaurant sites | Used Firecrawl to render the full page before passing content to Gemini |
| Streaming partial agent state | Four agents filling different slices of the same dish object caused UI flickering | Designed the SSE event envelope so the frontend merges updates incrementally |


## Accomplishments That We're Proud Of

The scan actually works on real menus. Not perfect digital scans but physical 
paper menus, phone camera, imperfect lighting. Seeing Gemini Vision correctly 
pull every dish, category, and price off a printed menu was the moment the 
project felt real.

The streaming architecture reflects what is actually happening under the hood. 
Watching four agents light up and resolve one by one is not just a visual 
thing — it is the real parallel execution made visible. It makes the app feel 
alive in a way a single API call never would.

It works for any restaurant in Madison dynamically. No hardcoded restaurant 
list. Any spot on the map, any menu, right now.


## What We Learned

* Locking a shared schema at the very start of the night was the single best 
  team decision we made. Nobody waited on anyone else and integration at the 
  end was almost painless.

* The most interesting problems in a 24 hour hackathon are never the ones you 
  planned for. Deprecated APIs, JavaScript rendered pages, and SSE state 
  merging were all surprises that each needed a real solution found fast.

* The demo moment matters as much as the engineering. The sound design, the 
  streaming UI, the laser sweep animation — every one of those was a 
  deliberate decision because we knew judges would be watching. Making it 
  feel real is part of making it real.


## What's Next for MadisonBites

| Feature | What It Is |
|---|---|
| Expand beyond Madison | The architecture is already city agnostic — the name is the only thing that is not |
| Order for the Table | Multi person mode that finds dishes working for everyone's allergen filters at the same time |
| Macro Trend Tracker | A weekly view showing how a meal fits your day's nutrition goals |
| User Photos | Crowd sourced dish photos so the dataset improves the more people use it |
| Price Tier Filter | Filter restaurants by budget using the Places API price level field |
