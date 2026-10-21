import { Link } from "react-router-dom";
import { channelUrl } from "../data/videos";
import { slugify } from "../data/categories";

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

const aboutLinks = [
  "Advertise With Us",
  "Privacy Policy",
  "Careers",
  "Contact Us",
  "Terms & Conditions",
];

const sectionLinks = [
  "News",
  "GTN Originals",
  "Wananchi Reporting",
  "Business",
  "Sports",
  "Entertainment",
  "Opinion & Blogs",
];

const contactInfo = [
  { label: "+254 700 000 000" },
  { label: "newsdesk@gusitelevision.co.ke" },
  { label: "Kisii, Gusii Region, Kenya" },
];

const productLinks = [
  "GTN News",
  "GTN TV",
  "GTN Radio",
  "GTN Podcasts",
  "GTN Live Events",
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <img src="/logo.png" alt="GTN News" className="footer__logo" />
          <p>
            Grand Television Network — independent reporting from the newsroom
            to your screen. Breaking news, analysis and live coverage, around
            the clock.
          </p>
          <div className="footer__social">
            <a href={channelUrl} target="_blank" rel="noreferrer">
              YouTube
            </a>
          </div>
        </div>

        <nav className="footer__col" aria-label="Sections">
          <h3>Sections</h3>
          <ul>
            {sectionLinks.map((name) => (
              <li key={name}>
                <Chevron />
                <Link to={`/category/${slugify(name)}`}>{name}</Link>
              </li>
            ))}
            <li>
              <Chevron />
              <Link to="/news">All News</Link>
            </li>
          </ul>
        </nav>

        <div className="footer__col" aria-label="About us">
          <h3>About Us</h3>
          <ul>
            {aboutLinks.map((link) => (
              <li key={link}>
                <Chevron />
                <span>{link}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__col" aria-label="Contact info">
          <h3>Contact Info</h3>
          <ul>
            {contactInfo.map((item) => (
              <li key={item.label}>
                <Chevron />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <nav className="footer__col" aria-label="Our products">
          <h3>Our Products</h3>
          <ul>
            {productLinks.map((link) => (
              <li key={link}>
                <Chevron />
                <Link to="/tv">{link}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <span>© 2026 GTN News. All rights reserved.</span>
          <span className="footer__legal">
            <Link to="/admin">Admin</Link>
            <a href={channelUrl} target="_blank" rel="noreferrer">
              YouTube
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
