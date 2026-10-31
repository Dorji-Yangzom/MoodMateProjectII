import type { MoodPreferences } from '../screens/MoodPreferencesScreen';

// Describes one activity in our catalogue.
export type Activity = {
  id: string;
  title: string;
  description: string;
  minutes: number;
  location: MoodPreferences['location'];
  energy: MoodPreferences['energy'];
  moods: MoodPreferences['mood'][];
};

// A recommendation includes its score and an explanation.
export type Recommendation = Activity & {
  score: number;
  reason: string;
};

// Activity details are fixed, but their ranking depends on the user.
const activities: Activity[] = [
  {
    id: 'slow-breathing',
    title: 'Slow breathing',
    description: 'Sit comfortably and breathe slowly at your own pace.',
    minutes: 5,
    location: 'Indoor',
    energy: 'Low',
    moods: ['Stressed', 'Sad', 'Calm'],
  },
  {
    id: 'music-break',
    title: 'A little music break',
    description: 'Play a favourite song and listen without distractions.',
    minutes: 5,
    location: 'Indoor',
    energy: 'Low',
    moods: ['Sad', 'Happy', 'Bored'],
  },
  {
    id: 'gentle-stretch',
    title: 'Gentle stretching',
    description: 'Try comfortable shoulder, arm and leg stretches.',
    minutes: 5,
    location: 'Indoor',
    energy: 'Medium',
    moods: ['Stressed', 'Bored', 'Calm'],
  },
  {
    id: 'creative-break',
    title: 'Draw something simple',
    description: 'Use a pen and paper to sketch anything you like.',
    minutes: 15,
    location: 'Indoor',
    energy: 'Medium',
    moods: ['Bored', 'Happy', 'Calm'],
  },
  {
    id: 'dance-break',
    title: 'Dance to your favourite songs',
    description: 'Choose some music and move in a way you enjoy.',
    minutes: 15,
    location: 'Indoor',
    energy: 'High',
    moods: ['Happy', 'Bored'],
  },
  {
    id: 'fresh-air',
    title: 'A fresh-air pause',
    description: 'Find a comfortable outdoor spot and enjoy a quiet pause.',
    minutes: 5,
    location: 'Outdoor',
    energy: 'Low',
    moods: ['Stressed', 'Sad', 'Calm'],
  },
  {
    id: 'notice-nature',
    title: 'Notice the little things',
    description: 'Look around and notice colours, plants and sounds.',
    minutes: 5,
    location: 'Outdoor',
    energy: 'Low',
    moods: ['Calm', 'Sad', 'Bored'],
  },
  {
    id: 'short-walk',
    title: 'A short walk',
    description: 'Take an easy walk somewhere familiar and safe.',
    minutes: 5,
    location: 'Outdoor',
    energy: 'Medium',
    moods: ['Happy', 'Stressed', 'Bored'],
  },
  {
    id: 'photo-walk',
    title: 'A photo walk',
    description: 'Walk slowly and photograph three things you find interesting.',
    minutes: 15,
    location: 'Outdoor',
    energy: 'Medium',
    moods: ['Happy', 'Bored', 'Calm'],
  },
  {
    id: 'brisk-walk',
    title: 'An energetic walk',
    description: 'Walk at a comfortable brisk pace along a safe route.',
    minutes: 30,
    location: 'Outdoor',
    energy: 'High',
    moods: ['Happy', 'Bored', 'Stressed'],
  },
];

export function recommendActivities(
  preferences: MoodPreferences,
  recentActivityIds: string[] = []
): Recommendation[] {
  // Remove activities that exceed the time or use another location.
  const suitable = activities.filter(
    (activity) =>
      activity.minutes <= preferences.minutes &&
      activity.location === preferences.location
  );

  const ranked = suitable.map((activity): Recommendation => {
    let score = 0;
    const reasons: string[] = [];

    // Mood has the largest weight in our ranking.
    if (activity.moods.includes(preferences.mood)) {
      score += 4;
      reasons.push(`matches your ${preferences.mood.toLowerCase()} mood`);
    }

    // Prefer activities with the same energy level.
    const energyLevels = ['Low', 'Medium', 'High'];
    const energyDifference = Math.abs(
      energyLevels.indexOf(activity.energy) -
        energyLevels.indexOf(preferences.energy)
    );

    if (energyDifference === 0) {
      score += 3;
      reasons.push('matches your energy');
    } else if (energyDifference === 1) {
      score += 1;
    }

    // Keep recent activities available, but encourage some variety.
    const recentlyCompleted = recentActivityIds.includes(activity.id);

    if (recentlyCompleted) {
      score -= 3;
    }

    reasons.push(`fits within ${preferences.minutes} minutes`);
    reasons.push(`works ${preferences.location.toLowerCase()}s`);

    if (recentlyCompleted) {
      reasons.push('recently completed, so ranked lower for variety');
    }

    return {
      ...activity,
      score,
      reason: reasons.join('; ') + '.',
    };
  });

  // Highest scores come first. IDs give equal scores a stable order.
  ranked.sort(
    (first, second) =>
      second.score - first.score ||
      first.id.localeCompare(second.id)
  );

  // Return up to three activities without changing the original catalogue.
  return ranked.slice(0, 3);
}