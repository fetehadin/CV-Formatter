import { parseResume, type Resume } from "./schema"

/** A realistic sample CV so new visitors can see every feature before typing anything. */
export function exampleResume(): Resume {
  return parseResume({
    basics: {
      name: "Hana Bekele",
      headline: "Frontend Engineer",
      email: "hana.bekele@example.com",
      phone: "+251 911 234 567",
      location: "Addis Ababa, Ethiopia",
      linkedin: "linkedin.com/in/hanabekele",
      github: "github.com/hanabekele",
    },
    summary:
      "Frontend engineer with 3 years building React and TypeScript apps for fintech. Rebuilt a merchant dashboard used by 1,200 businesses and cut its load time by 45%.",
    experience: [
      {
        role: "Frontend Engineer",
        company: "Lalibela Pay",
        location: "Addis Ababa",
        start: { month: "Aug", year: "2022" },
        current: true,
        bullets: [
          "Rebuilt the merchant dashboard in React and TypeScript, now used by 1,200 businesses",
          "Cut page load time by 45% with code-splitting and image optimisation",
          "Responsible for the payments settings page",
          "Mentored 2 junior developers through weekly code reviews",
        ],
      },
      {
        role: "Junior Web Developer",
        company: "Abay Digital",
        location: "Remote",
        start: { month: "Jan", year: "2021" },
        end: { month: "Jul", year: "2022" },
        bullets: ["Built 8 marketing websites for local clients", "Worked on the company's booking system"],
      },
    ],
    education: [
      {
        school: "Addis Ababa University",
        degree: "B.Sc. Software Engineering",
        start: { month: "Sep", year: "2016" },
        end: { month: "Jul", year: "2020" },
        bullets: ["GPA 3.6/4.0"],
      },
    ],
    projects: [
      {
        name: "Clinic Queue",
        link: "github.com/hanabekele/clinic-queue",
        tech: "React, Node.js, PostgreSQL",
        bullets: ["Offline-first queue app used by 3 clinics to cut waiting-room crowding"],
      },
    ],
    skills: [
      { name: "Languages", items: "TypeScript, JavaScript, HTML, CSS, SQL" },
      { name: "Frameworks", items: "React, Next.js, Node.js, Tailwind CSS" },
      { name: "Tools", items: "Git, Docker, Jest, Figma" },
    ],
    certifications: [{ name: "Meta Front-End Developer", issuer: "Coursera", date: { month: "Mar", year: "2022" } }],
    languages: [
      { language: "Amharic", fluency: "Native" },
      { language: "English", fluency: "Fluent" },
    ],
  })
}
