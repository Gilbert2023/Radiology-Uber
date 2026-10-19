export interface NavItem {
  href: string;
  label: string;
  short?: string;
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Learn",
    items: [
      { href: "/", label: "Dashboard" },
      { href: "/console/", label: "Console Walkthrough" },
      { href: "/parameters/", label: "Parameter Academy" },
      { href: "/advanced/", label: "Beyond the Screenshot" },
      { href: "/physics/", label: "Physics Centre" },
    ],
  },
  {
    group: "Practise",
    items: [
      { href: "/simulator/", label: "Console Simulator" },
      { href: "/cases/", label: "Clinical Cases" },
      { href: "/troubleshooting/", label: "Troubleshooting" },
      { href: "/assessments/", label: "Assessments" },
    ],
  },
  {
    group: "Reference",
    items: [
      { href: "/sequences/", label: "Sequence Library" },
      { href: "/protocols/", label: "Protocol Library" },
      { href: "/decision/", label: "Decision Assistant" },
      { href: "/images/", label: "Image Comparison" },
      { href: "/safety/", label: "MRI Safety" },
      { href: "/references/", label: "References & Governance" },
    ],
  },
];
