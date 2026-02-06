export type AudioTrack = {
  id: string;
  title: string;
  file: string;
};

export const audioTracks: AudioTrack[] = [
  {
    id: "track-1",
    title: "Trip",
    file: "/music/trip.mp3",
  },
  {
    id: "track-2",
    title: "Bass Drum Remix",
    file: "/music/bass-drum-remix.mp3",
  },
  {
    id: "track-3",
    title: "13.5s Recording A",
    file: "/music/recording-a.mp3",
  },
  {
    id: "track-4",
    title: "13.5s Recording B",
    file: "/music/recording-b.mp3",
  },
];
