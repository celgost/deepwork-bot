# **Deep Work Bot Spec

Discord bot that runs **four daily 2-hour deep work blocks** using **one pinned daily message**, **reaction-based signup**, **temporary roles**, and **locked permanent voice channels**.

---

## 1. Fixed server elements

### Roles

- `Deep Work 50`
- `Deep Work 100`  
    Used temporarily to grant voice access.

---

### Channels

Text:

- `#deep-work` (signup, timers, prompts)

Voice:

- `🧠 Deep Work 50`
- `🧠 Deep Work 100`  
    Locked by default. Only the matching role can join.

---

## 2. Daily blocks (CET)

|Block|Time|
|---|---|
|A|10:00–12:00|
|B|14:00–16:00|
|C|18:00–20:00|
|D|22:00–00:00|

Each block has two modes:

- DW50
- DW100

---

## 3. The daily pinned message

Posted once per day in `#deep-work`.

Example:

> **Deep Work Today**
> 
> **A**  
> 🟢 Starts <t:1700017200:t>  
> 🔴 Ends <t:1700024400:t>  
> 🔒 Locks <t:1700016900:R>
> 
> 1️⃣ Deep Work 50  
> Brice (celgost), Alex (alex)
> 
> 2️⃣ Deep Work 100  
> Mei (mei)
> 
> **B**  
> 🟢 Starts <t:1700017200:t>  
> 🔴 Ends <t:1700024400:t>  
> 🔒 Locks <t:1700016900:R>
> 
> 3️⃣ Deep Work 50  
> No one yet
> 
> 4️⃣ Deep Work 100  
> No one yet
> 
> **C** 
> 🟢 Starts <t:1700017200:t>  
> 🔴 Ends <t:1700024400:t>  
> 🔒 Locks <t:1700016900:R>
> 
> 5️⃣ Deep Work 50  
> Mei (mei)
> 
> 6️⃣ Deep Work 100
> No one yet
> 
> **D** 
> 🟢 Starts <t:1700017200:t>  
> 🔴 Ends <t:1700024400:t>  
> 🔒 Locks <t:1700016900:R>
> 
> 7️⃣ Deep Work 50  
> No one yet
> 
> 8️⃣ Deep Work 100
> No one yet
> 
> React to join. You can change or cancel anytime before each block locks.

Under each option, the bot edits the message to show attendees:

> 3️⃣ Deep Work 50  
> Brice (celgost), Alex (alex#1234)

Names shown as:  
**Display Name (username)**

Live updated as reactions change.

---

## 4. Reaction mapping

|Emoji|Block|Mode|
|---|---|---|
|1️⃣|A|DW50|
|2️⃣|A|DW100|
|3️⃣|B|DW50|
|4️⃣|B|DW100|
|5️⃣|C|DW50|
|6️⃣|C|DW100|
|7️⃣|D|DW50|
|8️⃣|D|DW100|

Users can have only **one reaction per block**.

---

## 5. Lock-in (5 minutes before each block)

At T−5 for a block:

Bot:

- Reads its two reactions
- Assigns roles:
    - DW50 to DW50 users
    - DW100 to DW100 users
- Replaces “Locks <t…>” with:
    > 🔒 Locked

Other blocks remain editable.

---

## 6. Session start (T)

At block start, bot does three things:

### 1. Posts in `#deep-work`

> 🧠 Block B started
> 
> Deep Work 50: 50 → 10 → 50  
> Deep Work 100: 100 → 20

No pings here.

### 2. In **🧠 Deep Work 50** voice channel text chat

Bot sends:

> @Deep Work 50  
> What is your todolist for this session?  
> Write it here concisely.

Only DW50 participants see and answer this.

### 3. In **🧠 Deep Work 100** voice channel text chat

Bot sends:

> @Deep Work 100  
> What is your todolist for this session?  
> Write it here concisely.

Same isolation.
People reply in the same channel.

---

## 7. Timers

Bot posts markers in associated voice channel:

+50

> ⏸ Deep Work 50 break (10 minutes) @DW50

+60

> ▶ Deep Work 50 second sprint @DW50

+100

> ⏸ Deep Work 100 break (20 minutes) @DW100

---

## 8. Session end (+120)

Bot:

- Removes both roles from all users
- Posts:

> Block ended.  
> Did you do what you planned?  
> yes / partial / no

---

## 9. Cancellation rules

Before lock-in:

- Remove reaction = leave block

After lock-in:

- Role already assigned
- They may leave the voice room, but cannot be replaced

---

## 10. Daily reset

At 00:05 CET:

- Bot removes yesterday’s message from pinned
- Posts and pin a new one
- Clears any leftover DW roles

---
