import { parseResume, type Resume } from "./schema"

/**
 * The maker's own CV, used as the sample so new visitors can see every
 * feature before typing anything. It's real, so it is never "improved" with
 * invented facts. Check shows what it would flag, honestly.
 */
export function exampleResume(): Resume {
  return parseResume({
    basics: {
      name: "Fetehadin Negash",
      headline: "Full-Stack Software Engineer",
      email: "fetehadinnegash@gmail.com",
      phone: "+251 986 955 964",
      location: "Addis Ababa, Ethiopia",
      linkedin: "linkedin.com/in/fetehadin",
      github: "github.com/fetehadin",
      website: "fetehadin.com",
    },
    summary:
      "Full-Stack Software Engineer specializing in building scalable, high-performance web applications. I combine a strong foundation in backend architecture (Python/Django) with proficiency in modern frontend frameworks (JavaScript, Next.js, NodeJS) to deliver robust end-to-end solutions. With a disciplined engineering background, I apply structural logic to design modular, maintainable systems. Passionate about technical leadership, collaborative development, and leveraging diverse technologies to solve complex, real-world problems.",
    education: [
      {
        school: "HiLCoE School of Computer Science & Technology",
        degree: "B.Sc. in Software Engineering",
        start: { year: "2025" },
        current: true,
        bullets: [
          "Developed core competencies in System Architecture and scalable System Design principles",
          "Integrated Software Engineering Lifecycles into production-grade software development",
          "Practiced modular code design and maintainable engineering for complex systems",
          "Focused on high-performance optimization through advanced algorithmic analysis",
        ],
      },
      {
        school: "INSA Cyber Talent Program",
        degree: "Software development training",
        start: { month: "Jun", year: "2025" },
        end: { month: "Oct", year: "2025" },
      },
      {
        school: "Nexus",
        degree: "Data Structures & Algorithms",
        start: { month: "Jun", year: "2025" },
        end: { month: "Sep", year: "2025" },
        bullets: [
          "Mastered advanced concepts in space and time complexity, sorting algorithms, two pointers, and sliding window, directly leveraging these algorithmic patterns to optimize logic and solve complex real-world engineering problems with high efficiency",
        ],
      },
      {
        school: "ALX",
        degree: "Backend Software Engineering",
        start: { month: "Aug", year: "2024" },
        end: { month: "Jan", year: "2025" },
        bullets: [
          "Engineered scalable backend services using Python and Django",
          "Optimized database performance through rigorous schema design and efficient querying",
          "Applied Agile methodologies to deliver robust, production-ready software solutions",
        ],
      },
    ],
    experience: [
      {
        role: "Full-Stack Software Engineer",
        company: "EduConnect",
        start: { month: "Jul", year: "2025" },
        current: true,
        bullets: [
          "Architected a modular educational ecosystem utilizing Python and Django/DRF, focusing on system scalability and seamless backend integration for campus-wide services",
          "Designed a scalable, role-based access control (RBAC) system, a centralized resource hub, and an efficient announcement/opportunity board to streamline campus communication",
          "Implemented a centralized dashboard to track academic discussions and events using Python, Django/DRF, and PostgreSQL",
        ],
      },
      {
        role: "Data Encoder",
        company: "Ethiopian AI Institute",
        start: { month: "Aug", year: "2025" },
        end: { month: "Dec", year: "2025" },
        bullets: [
          "Contributed to critical nationwide AI infrastructure by architecting and cleaning structured datasets",
          "Ensured high data quality and accuracy to effectively feed machine learning models",
        ],
      },
      {
        role: "Volunteer Mentor",
        company: "ALX",
        start: { month: "Jun", year: "2025" },
        end: { month: "Jul", year: "2025" },
        bullets: [
          'Served as a "Catch Up Squad" member, providing technical guidance and support to frontend learners',
          "Posted helpful content in forums, answered technical questions in Discord, and created a safe, inclusive environment for peer learning",
          "Demonstrated leadership through knowledge-sharing and encouragement",
        ],
      },
    ],
    projects: [
      {
        name: "Library Management System",
        tech: "Git, GitHub",
        start: { month: "Aug", year: "2024" },
        end: { month: "Jan", year: "2025" },
        bullets: ["Designed and implemented CRUD operations with optimized queries", "Collaborated using Git and GitHub, applying Agile workflows"],
      },
    ],
    skills: [
      { name: "Languages & Frameworks", items: "Python, Java, C++, JavaScript, Node.js, Next.js, Django, Django REST Framework, SQL" },
      { name: "Tools & Technologies", items: "Git, Docker, Linux, PostgreSQL, System Architecture" },
    ],
    sectionOrder: ["summary", "education", "experience", "projects", "skills", "certifications", "languages"],
  })
}
