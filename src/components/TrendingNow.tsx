import { Link } from "react-router-dom";
import { useNews } from "../store/NewsContext";

type Props = {
  id?: string;
  title?: string;
};

export default function TrendingNow({ id, title = "trending now" }: Props) {
  const { stories } = useNews();
  const items = stories.slice(0, 5);

  return (
    <section className="trending" id={id}>
      <h2 className="section__title">{title}</h2>
      <ol className="trending__list">
        {items.map((story) => (
          <li className="trending__item" key={story.id}>
            <Link className="trending__link" to={`/story/${story.id}`}>
              {story.title}
            </Link>
            <span className="trending__time">{story.time}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
