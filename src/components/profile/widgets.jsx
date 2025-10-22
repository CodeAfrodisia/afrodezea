// src/components/profile/widgets.jsx
import QuizWidget from "./widgets/QuizWidget.jsx";
import AffirmationWidget from "./widgets/AffirmationWidget.jsx";
import FavoritesWidget from "./widgets/FavoritesWidget.jsx";
import AchievementsWidget from "./widgets/AchievementsWidget.jsx";
import BreathWidget from "./widgets/BreathWidget.jsx";

export const WIDGETS = {
  quiz: {
    label: "Quiz",
    variations: {
      // Shows latest public attempt (or specific attempt if refId provided)
      default: (props) => <QuizWidget {...props} />,
      single: (props) => <QuizWidget {...props} single />,
    },
  },
  affirmation: {
    label: "Daily Affirmation",
    variations: {
      default: (props) => <AffirmationWidget {...props} />,
    },
  },
  favorites: {
    label: "Favorites",
    variations: {
      grid: (props) => <FavoritesWidget {...props} />,
      default: (props) => <FavoritesWidget {...props} />,
    },
  },
  achievements: {
    label: "Achievements",
    variations: {
      default: (props) => <AchievementsWidget {...props} />,
      compact: (props) => <AchievementsWidget {...props} compact />,
    },
  },
  breath: {
    label: "Breathe",
    variations: {
      default: (props) => <BreathWidget {...props} />,
    },
  },
};
