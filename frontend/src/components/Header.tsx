"use client";

import { memo } from "react";

/**
 * GrantPilot no-op header.
 *
 * The old global header had a fake search box with a ⌘K hint, but it did not
 * perform useful search. Grant Explorer, Intake, and other pages now own their
 * own task-specific controls, so keeping a fake global search bar created
 * visual clutter and awkward sticky spacing.
 */
export const Header = memo(function Header() {
  return null;
});

export default Header;
