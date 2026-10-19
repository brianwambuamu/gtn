export const channelUrl = "https://www.youtube.com/@gusiitelevisionnetwork";
export const channelName = "Gusii Television Network - GTN";

export type Video = {
  id: string;
  title: string;
  duration: string;
  views: string;
  published: string;
};

export const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const embedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}`;
