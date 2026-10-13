import { NavLink } from "react-router-dom";
import { slugify } from "../data/categories";
import { useCategories } from "../store/CategoriesContext";

export default function CategoryTabs() {
  const {categories} = useCategories();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `subnav__link${isActive ? " subnav__link--active" : ""}`;

  return (
    <nav className="subnav" aria-label="Categories">
      <div className="subnav__list">
        <NavLink to="/news" end className={linkClass}>
          News
        </NavLink>
        {categories.map((cat) =>
          cat === "News" ? null : (
            <NavLink
              key={cat}
              to={`/category/${slugify(cat)}`}
              className={linkClass}
            >
              {cat}
            </NavLink>
          ),
        )}
      </div>
    </nav>
  );
}
