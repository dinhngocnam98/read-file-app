import { Module } from '@nestjs/common';
import { Uv2600Service } from './uv2600.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Subject, debounceTime } from 'rxjs';
import { watcherChokidar } from 'src/common/watcher';
import {
  Uv2600_report,
  Uv2600_reportSchema,
} from 'src/schemas/uv2600_report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Uv2600_report.name,
        schema: Uv2600_reportSchema,
      },
    ]),
  ],
  providers: [Uv2600Service, watcherChokidar],
})
export class Uv2600Module {
  constructor(
    private Uv2600Service: Uv2600Service,
    private watcherChokidar: watcherChokidar,
  ) {}

  async onApplicationBootstrap() {
    const rootDir = 'D:/root';

    const folderPaths = await this.Uv2600Service.readRoot(rootDir);
    // const folderPaths = [{ folder_dir: 'S:/test', device: 'MAY UV 1800' },{ folder_dir: 'T:/test', device: 'MAY UV 2600' }];

    const promises = [];
    folderPaths.forEach((item: any) => {
      const promise = this.Uv2600Service.readFileContents(item);
      promises.push(promise);
    });
    await Promise.all(promises)
      .then(() => console.log('May UV 2600 had read all shortcuts'))
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
      console.log(pathEdit);

      this.Uv2600Service.readFileContents({
        folder_dir: pathEdit,
        device: event.device,
      });
    });

    const intervalInMilliseconds = 15 * 60 * 1000;
    setInterval(async () => {
      const promisesErrorDir = [];

      if (this.watcherChokidar.errorFolderWatchers.length > 0) {
        console.log(
          'May UV 2600 has errorFolderWatchers',
          this.watcherChokidar.errorFolderWatchers,
        );
        this.watcherChokidar.errorFolderWatchers.forEach((data) => {
          this.watcherChokidar.watcherChokidar(data);
        });
      }
      if (this.Uv2600Service.errorDir.length > 0) {
        console.log('May UV 2600 has errorDir', this.Uv2600Service.errorDir);
        this.Uv2600Service.errorDir.forEach((data) => {
          const promise = this.Uv2600Service.readFileContents(data);
          promisesErrorDir.push(promise);
        });
        await Promise.all(promisesErrorDir).catch((error) =>
          console.error(error),
        );
      }
    }, intervalInMilliseconds);
  }
}
