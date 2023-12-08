import * as chokidar from 'chokidar';

export class watcherChokidar {
  watchers: any[] = [];

  errorFolderWatchers: any[] = [];

  watcherChokidar = (data: any) => {
    const watcher = chokidar.watch(data.folder_dir, {
      ignored: [
        '**/DA.M',
        '**/*.macaml',
        '**/*.REG',
        '**/*.ch',
        '**/*.ini',
        '**/*.PDF',
        '**/*.LOG',
        '**/*.acaml',
        '**/*.XML',
        '**/*.MTH',
        '**/*_SAVED.TXT',
        '**/acq.txt',
        '**/intermediate.txt',
        '**/*.bak'
      ],
      persistent: true,
      usePolling: true,
      ignoreInitial: true,
    });

    watcher.on('error', (error) => {
      watcher.close();
      const errorWatcher = this.errorFolderWatchers.findIndex(
        (item) => item.device === data.device,
      );
      if (errorWatcher === -1) {
        this.errorFolderWatchers.push({
          folder_dir: data.folder_dir,
          device: data.device,
        });
      }
      const watchersIndex = this.watchers.findIndex(
        (item) => item.device === data.device,
      );
      if (watchersIndex !== -1) {
        this.watchers.splice(watchersIndex, 1);
      }
    });
    this.watchers.push({
      watcher: watcher,
      folder_dir: data.folder_dir,
      device: data.device,
    });
  };
}
