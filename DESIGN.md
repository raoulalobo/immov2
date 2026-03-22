# Design System — ImmoV2

## Product Context
- **What this is:** Marketplace de terrains et propriétés foncières au Cameroun — mise en relation vendeurs/acheteurs avec vérification vendeur
- **Who it's for:** Vendeurs de terrains (particuliers + agents fonciers) et acheteurs (diaspora camerounaise, investisseurs locaux, constructeurs)
- **Space/industry:** Immobilier foncier en Afrique francophone — aucun concurrent de référence
- **Project type:** Web app (search + listings + dashboard vendeur + admin panel)

## Aesthetic Direction
- **Direction:** Organic/Natural
- **Decoration level:** Intentional — texture grain légère sur les surfaces, pas de décoration gratuite
- **Mood:** Chaleureux, enraciné, professionnel sans être corporate. On vend de la TERRE au Cameroun — l'esthétique évoque le sol, la végétation, l'enracinement. Pas le bleu corporate froid des concurrents.
- **Reference sites:** Property24.com (Afrique du Sud, leader), Land.ng (Nigeria, foncier), Krent.space (Nigeria, moderne), Mapiole.com (Cameroun)

## Typography
- **Display/Hero:** General Sans — géométrique mais chaleureuse, lisible en gros, caractère distinctif. Weights: 500, 600, 700.
- **Body:** DM Sans — excellente lisibilité sur mobile, support complet français (accents), légère. Weights: 300, 400, 500, 600, 700.
- **UI/Labels:** DM Sans (même que body, weight 500)
- **Data/Tables:** DM Sans (font-variant-numeric: tabular-nums) — alignement parfait des colonnes de prix
- **Code:** JetBrains Mono (admin panel uniquement)
- **Loading:** Google Fonts CDN avec `display=swap` pour éviter le FOIT
- **Scale:**
  - 3xl: 48px / 3rem — Hero principal
  - 2xl: 32px / 2rem — Titres de section
  - xl: 24px / 1.5rem — Sous-titres, prix en détail
  - lg: 20px / 1.25rem — Titres de cards, prix en listing
  - md: 16px / 1rem — Body text
  - sm: 14px / 0.875rem — UI labels, metadata
  - xs: 12px / 0.75rem — Badges, captions
  - 2xs: 11px / 0.6875rem — Section labels, micro-text

## Color
- **Approach:** Balanced — primary + secondary, semantic colors pour la hiérarchie
- **Primary:** `#2D6A4F` (vert forêt profond) — confiance, terre, nature. Variantes: light `#40916C`, dark `#1B4332`
- **Secondary:** `#D4A373` (terre de sienne/ocre) — chaleur, sol camerounais, accent distinctif. Variantes: light `#E6C9A8`, dark `#B08050`
- **Neutrals:** Warm grays (pas de gris froids)
  - `#FAF7F2` — Background principal
  - `#F0EBE3` — Background subtle/elevated
  - `#E8E0D5` — Borders
  - `#B5A898` — Text muted
  - `#6B5E50` — Text secondary
  - `#2C2418` — Text primary
- **Semantic:**
  - Success: `#2D6A4F` (même que primary — vert = positif)
  - Warning: `#E9C46A` (ambre chaud)
  - Error: `#E63946` (rouge vif, contraste fort)
  - Info: `#457B9D` (bleu ardoise)
- **WhatsApp:** `#25D366` (couleur officielle WhatsApp pour le bouton Contacter)
- **Dark mode:** Inversion des surfaces (fond `#1A1612`, elevated `#2C2418`, borders `#4A3F32`), texte `#FAF7F2`, saturation des couleurs primaires augmentée de 10-15%

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — assez d'air pour respirer sur mobile, pas dense comme Land.ng, pas aéré comme un site luxe
- **Scale:**
  - 2xs: 2px — Micro-gaps (entre icône et texte inline)
  - xs: 4px — Tight spacing (entre éléments d'un même groupe)
  - sm: 8px — Intra-component (padding de badges, gap entre chips)
  - md: 16px — Standard spacing (padding de cards, gap entre form fields)
  - lg: 24px — Section spacing (entre composants dans une page)
  - xl: 32px — Large spacing (entre sections)
  - 2xl: 48px — Page-level spacing (padding vertical de sections)
  - 3xl: 64px — Hero/major sections

## Layout
- **Approach:** Grid-disciplined — grille stricte pour les listings, avec du souffle
- **Grid:**
  - Mobile (<640px): 1 colonne, padding 16px
  - Tablet (640-1024px): 2 colonnes, padding 24px
  - Desktop (>1024px): 3 colonnes listings, padding 24px
  - Admin: 4 colonnes data tables
- **Max content width:** 1080px
- **Border radius:** Hiérarchique
  - sm: 4px — Inputs, badges, tags
  - md: 8px — Cards, boutons, alertes
  - lg: 12px — Modals, containers majeurs
  - full: 9999px — Avatars, chips de filtre, bouton toggle theme

## Motion
- **Approach:** Minimal-functional — uniquement les transitions qui aident à comprendre
- **Easing:**
  - Enter: ease-out (éléments qui apparaissent)
  - Exit: ease-in (éléments qui disparaissent)
  - Move: ease-in-out (repositionnement)
- **Duration:**
  - Micro: 50-100ms — Hover states, focus rings
  - Short: 150-250ms — Boutons, toggles, tooltips
  - Medium: 250-400ms — Panels, modals, page transitions
  - Long: 400-700ms — Non utilisé au MVP (zéro animation décorative — chaque animation coûte des octets sur 3G)
- **Règle:** Si une animation ne rend pas l'interface plus compréhensible, elle n'existe pas.

## Component Patterns
- **Logo:** "Immo" en primary `#2D6A4F` + "V2" en secondary `#D4A373`, General Sans 700
- **Listing card:** Image (180px height) → prix (General Sans 700, primary) → location (DM Sans, text-secondary) → meta (surface + type, séparé par border-top)
- **Badge vérifié:** Background `#2D6A4F18`, texte primary, border-radius full
- **Bouton WhatsApp:** Background `#25D366`, texte blanc, icône WhatsApp optionnelle
- **Search hero:** Gradient primary-dark → primary, avec motif géométrique subtil en overlay, barre de recherche blanche + bouton secondary
- **Filter chips:** Background semi-transparent blanc sur fond coloré, border-radius full
- **Empty states:** Illustration minimaliste (emoji ou icône line), texte chaleureux, CTA primaire. Jamais "Aucun résultat." nu.
- **Loading skeletons:** Couleur `#E8E0D5` animée vers `#F0EBE3`, même forme que le contenu final

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-21 | Initial design system created | Created by /design-consultation based on competitive research (Property24, Land.ng, Krent, Mapiole) + product context (marketplace foncier Cameroun, mobile-first 3G) |
| 2026-03-21 | Palette terre/ocre choisie | Différenciateur vs concurrents (tous en bleu corporate ou vert menthe). Évoque le produit vendu (terre). |
| 2026-03-21 | Fond crème #FAF7F2 au lieu de blanc pur | Confort visuel sur mobile, chaleur, cohérence avec palette organique |
| 2026-03-21 | Zéro animation décorative | Contrainte 3G — chaque octet compte. Motion minimale-fonctionnelle uniquement. |
| 2026-03-21 | General Sans + DM Sans | General Sans apporte du caractère en display sans être excentrique. DM Sans est optimale pour le body mobile avec support français complet. |
