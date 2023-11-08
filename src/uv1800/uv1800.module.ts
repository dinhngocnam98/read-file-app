import { Module } from '@nestjs/common';
import {
  Uv1800_report,
  Uv1800_reportSchema,
} from 'src/schemas/uv1800_report.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Subject, debounceTime } from 'rxjs';
import { watcherChokidar } from 'src/common/watcher';
import { Uv1800Service } from './uv1800.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Uv1800_report.name,
        schema: Uv1800_reportSchema,
      },
    ]),
  ],
  providers: [Uv1800Service, watcherChokidar],
})
export class Uv1800Module {
  constructor(
    private Uv1800Service: Uv1800Service,
    private watcherChokidar: watcherChokidar,
  ) {}

  async onApplicationBootstrap() {
    const rootDir = 'D:/root';

    const folderPaths = await this.Uv1800Service.readRoot(rootDir);
    // const folderPaths = [{ folder_dir: 'S:/test', device: 'MAY UV 1800' },{ folder_dir: 'T:/test', device: 'MAY UV 2600' }];

    const promises = [];
    folderPaths.forEach((item: any) => {
      const promise = this.Uv1800Service.readFileContents(item);
      promises.push(promise);
    });
    await Promise.all(promises)
      .then(() => console.log('May UV 1800 had read all shortcuts'))
      .catch((error) => console.error(error));

    const eventSubject = new Subject();
    folderPaths.forEach((data: any) => {
      this.watcherChokidar.watcherChokidar(data);
    });

    this.watcherChokidar.watchers.forEach((data: any) => {
      data.watcher.on('addDir', (path: string) => {
        eventSubject.next({ event: 'addDir', path: path, device: data.device });
      });
    });

    eventSubject.pipe(debounceTime(1000)).subscribe((event: any) => {
      const pathEdit = event.path.replace(/\\/g, '/');
      this.Uv1800Service.readFileContents({
        folder_dir: pathEdit,
        device: event.device,
      });
    });

    const intervalInMilliseconds = 15 * 60 * 1000;
    setInterval(async () => {
      const promisesErrorDir = [];

      if (this.watcherChokidar.errorFolderWatchers.length > 0) {
        console.log(
          'May UV 1800 has errorFolderWatchers',
          this.watcherChokidar.errorFolderWatchers,
        );
        this.watcherChokidar.errorFolderWatchers.forEach((data) => {
          this.watcherChokidar.watcherChokidar(data);
        });
      }
      if (this.Uv1800Service.errorDir.length > 0) {
        console.log('May UV 1800 has errorDir', this.Uv1800Service.errorDir);
        this.Uv1800Service.errorDir.forEach((data) => {
          const promise = this.Uv1800Service.readFileContents(data);
          promisesErrorDir.push(promise);
        });
        await Promise.all(promisesErrorDir).catch((error) =>
          console.error(error),
        );
      }
    }, intervalInMilliseconds);
  }
}
