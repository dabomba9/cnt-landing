# Design System: CurbNTurf Redesign
**Project ID:** 5332325925002064958

# Design System Strategy: The Digital Outpost

## 1. Overview & Creative North Star
**Creative North Star: "The Refined Explorer"**
This design system moves away from the utilitarian "parking app" aesthetic and toward a high-end editorial experience. We are not just listing coordinates; we are curating "The RV Freedom Experience." The visual language balances the ruggedness of the outdoors with the precision of a professional concierge. 

To break the "template" look, we employ **Intentional Asymmetry**. Large-scale typography bleeds off-grid, while "floating" pill components break traditional container boundaries. We prioritize breathing room over information density, ensuring every interaction feels as expansive as the open road.

---

## 2. Color & Atmospheric Depth
Our palette is rooted in the earth but polished for the screen. We use the Material Design token logic to create a sophisticated, layered environment.

### The "No-Line" Rule
Explicitly prohibit 1px solid black or high-contrast borders for sectioning. Structural boundaries must be defined through background shifts (e.g., a `surface-container-low` section sitting on a `surface` background) or subtle tonal transitions.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine paper or frosted glass.
- **Base Layer:** `surface` (#fbf9f0) for the main canvas.
- **Intermediate Layer:** `surface-container-low` (#f6f4eb) for subtle content grouping.
- **Top Layer:** `surface-container-lowest` (#ffffff) for high-priority cards to create a natural, soft lift.

### The "Glass & Gradient" Rule
To elevate the platform, use **Glassmorphism** for floating elements (e.g., the 80px Pill Navbar). Apply `surface` colors at 70% opacity with a `backdrop-blur` of 20px. 
*Signature Polish:* Use a subtle linear gradient on primary CTAs—transitioning from `primary` (#a43700) to `primary-container` (#ce4700) at a 135° angle—to give buttons a tactile, "sun-drenched" quality.

---

## 3. Typography: Editorial Authority
The typography bridges the gap between mid-century adventure posters and modern tech.

- **Display & Headlines (SpaceGrotesk / Familjen Grotesk):** Use `display-lg` (3.5rem) for hero statements. Tighten letter-spacing to -0.02em for a high-end, authoritative feel.
- **Body & Labels (Manrope / Proxima-Nova):** Use `body-lg` (1rem) for readability. These fonts offer a clean, functional counterpoint to the expressive headlines.
- **Visual Rhythm:** Always pair a `display-sm` headline with a `label-md` in all-caps (0.05em tracking) to create an editorial "kick" that guides the eye.

---

## 4. Elevation & Depth: Tonal Layering
We do not use structural lines; we use light and shadow.

- **The Layering Principle:** Depth is achieved by "stacking" surface tiers. An inner container should always be one step higher or lower in the `surface-container` scale than its parent to define importance.
- **Ambient Shadows:** For floating elements, use a "Sunlight Shadow."
  - *Values:* `0px 20px 40px rgba(69, 69, 69, 0.06)`.
  - *Note:* The shadow is never grey; it is a tinted version of `on-surface` (#1b1c17) at a very low opacity to mimic natural ambient light.
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline-variant` (#e2bfb3) at 20% opacity. For the signature "Jungle Green" card borders, use `secondary` (#35684d) at 15% opacity.

---

## 5. Components: The Primitive Set

### Buttons & Chips
- **Signature Pill:** All buttons and badges must use `rounded-full` (9999px). 
- **Primary Button:** `primary` background, `on-primary` text. Padding: `spacing-3` (top/bottom) and `spacing-8` (left/right).
- **Glass Chip:** `surface-variant` at 40% opacity with a 10px blur for secondary filters.

### Panel Cards
- **Radius:** `lg` (2rem).
- **Styling:** Use `surface-container-lowest` (#ffffff) with the **Ghost Border** (15% Jungle Green). 
- **Interaction:** On hover, the card should transition its shadow from 4% to 8% opacity and shift -4px on the Y-axis.

### The Stat Block
- Large numeric values in `display-lg` (SpaceGrotesk).
- Underline the value with a 4px `tertiary-fixed` (#ffdf98) offset stroke to ground the data in the "RV Freedom" theme.

### Inputs & Forms
- Forbid divider lines. Use `surface-container-high` as the input background to contrast against the `surface` page.
- Focus state: A 2px `secondary` (#35684d) "Ghost Border" at 40% opacity.

---

## 6. Do’s and Don’ts

### Do:
- **Use the Grid as a Texture:** Overlay a subtle grid background with `secondary` lines at 5% opacity to evoke map-reading and exploration.
- **Embrace White Space:** Use `spacing-16` (5.5rem) between major sections to ensure the "Freedom" brand promise is felt spatially.
- **Layer Elements:** Allow images of RVs or landscapes to slightly overlap the edge of a card or the grid line to create a sense of three-dimensional space.

### Don’t:
- **No Sharp Corners:** Never use a radius smaller than `sm` (0.5rem). The outdoors are organic; the UI should be too.
- **No Pure Black:** Avoid #000000. Use `on-surface` (#1b1c17) for all text to maintain the "Cream & Earth" warmth.
- **No Standard Dividers:** Never use `<hr>` tags or 1px grey lines to separate content. Use a vertical `spacing-10` gap or a background color shift instead.
