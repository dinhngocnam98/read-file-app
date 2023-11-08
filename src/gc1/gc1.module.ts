import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Gc1_report, Gc1_reportSchema } from '../schemas/gc1_report.schema';
import { Subject, debounceTime } from 'rxjs';
import { watcherChokidar } from 'src/common/watcher';
import { Gc1Service } from './gc1.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Gc1_report.name,
        schema: Gc1_reportSchema,
      },
    ]),
  ],
  providers: [Gc1Service, watcherChokidar],
})
export class Gc1Module {
  constructor(
    private Gc1Service: Gc1Service,
    private watcherChokidar: watcherChokidar,
  ) {}
  async onApplicationBootstrap() {
    // const rootDir = ['../testTxT'];
    const rootDir = 'D:/root';

    const folderPaths = await this.Gc1Service.readRoot(rootDir);
    const promises = [];
    folderPaths.forEach((item: any) => {
      const promise = this.Gc1Service.readFileContents(item);
      promises.push(promise);
    });
    await Promise.all(promises)
      .then(() => console.log('May GC 1 had read all shortcuts!'))
      .catch((error) => console.error(error));

    // Theo dõi sự thay đổi trong thư mục và cập nhật nội dung của các tệp tin .txt
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
      this.Gc1Service.readFileContents({
        folder_dir: pathEdit,
        device: event.device,
      });
    });

    // // //Doc lai file loi
    const intervalInMilliseconds = 15 * 60 * 1000;
    setInterval(async () => {
      const promisesErrorDir = [];

      if (this.watcherChokidar.errorFolderWatchers.length > 0) {
        console.log(
          'May GC 1 has errorFolderWatchers',
          this.watcherChokidar.errorFolderWatchers,
        );
        this.watcherChokidar.errorFolderWatchers.forEach((data) => {
          this.watcherChokidar.watcherChokidar(data);
        });
      }
      if (this.Gc1Service.errorDir.length > 0) {
        console.log('May GC 1 has errorDir', this.Gc1Service.errorDir);
        this.Gc1Service.errorDir.forEach((data) => {
          const promise = this.Gc1Service.readFileContents(data);
          promisesErrorDir.push(promise);
        });
        await Promise.all(promisesErrorDir).catch((error) =>
          console.error(error),
        );
      }
    }, intervalInMilliseconds);
  }
}
