---
page: user-profile
---
A user profile dashboard for CurbNTurf allowing users to see their upcoming RV trips, past bookings, and account settings.

**DESIGN SYSTEM (REQUIRED):**
To break the "template" look, we employ **Intentional Asymmetry**. Large-scale typography bleeds off-grid, while "floating" pill components break traditional container boundaries. We prioritize breathing room over information density, ensuring every interaction feels as expansive as the open road.

### The "No-Line" Rule
Explicitly prohibit 1px solid black or high-contrast borders for sectioning. Structural boundaries must be defined through background shifts (e.g., a `surface-container-low` section sitting on a `surface` background) or subtle tonal transitions.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine paper or frosted glass.
- **Base Layer:** `surface` (#fbf9f0) for the main canvas.
- **Intermediate Layer:** `surface-container-low` (#f6f4eb) for subtle content grouping.
- **Top Layer:** `surface-container-lowest` (#ffffff) for high-priority cards to create a natural, soft lift.

### Typography
- **Display:** SpaceGrotesk (tight letter spacing).
- **Body:** Manrope.
- **Visual Rhythm:** Pair large headlines with small all-caps label-md for an editorial kick.

### Panel Cards
- **Radius:** `lg` (2rem).
- **Styling:** Use `surface-container-lowest` (#ffffff) with the **Ghost Border** (15% Jungle Green - #35684d). 

**Page Structure:**
1. A clean, glassmorphism top navigation bar.
2. A large, airy hero section welcoming the user back, possibly with a subtle map or nature grid texture.
3. A large grid/masonry display of "Upcoming Trips".
4. A sidebar or settings panel for account management. 
5. A signature rich footer.
