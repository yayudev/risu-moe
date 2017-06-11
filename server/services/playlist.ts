import { Song, CurrentSong } from "../types/Song";
import { createClient } from "redis";

type SongCallback = (s?: CurrentSong | string) => any;

class PlaylistService {
  client: any;
  listeners: Array<SongCallback>;

  constructor() {
    this.client = createClient();
    this.listeners = [];

    this.tick = this.tick.bind(this);
    this.addSongChangeListener = this.addSongChangeListener.bind(this);
    this.getFirstSongFromPlaylist = this.getFirstSongFromPlaylist.bind(this);
    this.updateCurrentSong = this.updateCurrentSong.bind(this);
    this.notifyChanges = this.notifyChanges.bind(this);
  }

  addSongChangeListener(listener: (s: CurrentSong | string) => void): void {
    this.listeners = [...this.listeners, listener];
  }

  notifyChanges() {
    this.listeners.forEach(async listener => {
      const currentSong = await this.getCurrentSong();

      if (!currentSong) {
        listener("no song");
        return;
      }

      listener(currentSong);
    });
  }

  async tick() {
    try {
      // Get songId from playlist
      const songFromPlaylist = await this.getFirstSongFromPlaylist();
      let currentSong = await this.getCurrentSong();

      // No songs in playlist, keep everything clean.
      if (!songFromPlaylist) {
        await this.removeCurrentSong();
        return;
      }

      // No song is registered as playing, play the one from the playlist.
      if (!currentSong) {
        currentSong = { ...songFromPlaylist, currentTime: "0" };
        await this.setCurrentSong(currentSong);
      }

      const currentTime = parseInt(currentSong.currentTime);
      const songDuration = parseInt(songFromPlaylist.duration);

      // If song ended its duration, play next song.
      if (currentTime >= songDuration) {
        await this.popCurrentSong();
        const newSong = await this.getFirstSongFromPlaylist();

        if (!newSong) {
          await this.removeCurrentSong();
          this.notifyChanges();
          return;
        }

        await this.setCurrentSong({ ...newSong, currentTime: "0" });
        return;
      }

      // Update current reference.
      await this.updateCurrentSong();
      this.notifyChanges();
    } catch (error) {
      // On error, clear the current song ref.
      console.log(error);
    }
  }

  async getFirstSongFromPlaylist(): Promise<Song | undefined> {
    try {
      const songIdFromPlaylist = await this.client.lindexAsync("playlist", 0);

      if (!songIdFromPlaylist) return;

      const songFromPlaylist: Song = await this.client.hgetallAsync(
        songIdFromPlaylist
      );

      return songFromPlaylist;
    } catch (e) {
      return undefined;
    }
  }

  async getCurrentSong(): Promise<CurrentSong | undefined> {
    const song: CurrentSong = await this.client.hgetallAsync("currentSong");
    return song;
  }

  async popCurrentSong(): Promise<void> {
    await this.client.lpopAsync("playlist");
  }

  async removeCurrentSong(): Promise<void> {
    await this.client.hdelAsync(
      "currentSong",
      "id",
      "fileUrl",
      "duration",
      "name",
      "user",
      "currentTime"
    );
  }

  async setCurrentSong(song: CurrentSong): Promise<void> {
    await this.client.hmsetAsync("currentSong", song);
  }

  async updateCurrentSong(): Promise<void> {
    const currentSong = await this.getCurrentSong();

    const updatedCurrentSong = {
      ...currentSong,
      currentTime: currentSong && currentSong.currentTime
        ? parseInt(currentSong.currentTime) + 1
        : 0
    };

    await this.client.hmsetAsync("currentSong", updatedCurrentSong);
  }

  async addSong(song: Song): Promise<void> {
    await this.client.hmsetAsync(song.id, song);
    await this.client.rpushAsync("playlist", song.id);
  }
}

export const playlistService = new PlaylistService();