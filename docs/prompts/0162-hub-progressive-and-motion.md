# Hub progressive tiles, depth and motion

This hub and all the available services for the different roles, doesn't looks good at all specially for Balance, alignement and etc. And overall they looks very text cluttered. Can we show them in a progressive manner like on hover/click? but definately don't put them in too much nested so they look accessible and User friendly as wll. But looks premium and balanced and a plateform build by a 20 Years experience lead UI/UX designer.

Also, provide a very subtle 3d emersive experience for components and their interaction without a distraction. And implement animation to the platform.

## Response

On `ui-polish/hub-progressive`: HUB-01 tiles now have a calm resting layer (icon, name, who, enter) and a details layer (purpose, route, secondary link) that fades in on hover, focus or an ⓘ toggle, inside fixed-height tiles so rows stay aligned (changelog 0162). Platform-wide, a delegated pointer listener adds a ≤2.5° tilt, lift and soft light to cards and tiles, and a motion stylesheet adds staggered page entrances and press feedback, all off for touch and reduced motion (changelog 0163).
