import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Gc4_report, Gc4_reportSchema } from '../schemas/gc4_report.schema';
import { Subject, debounceTime } from 'rxjs';
import { watcherChokidar } from 'src/common/watcher';
import { Gc4Service } from './gc4.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Gc4_report.name,
        schema: Gc4_reportSchema,
      }
    ]),
  ],
  providers: [Gc4Service, watcherChokidar],
})
export class Gc4Module {
  constructor(
    private Gc4Service: Gc4Service,
    private watcherChokidar: watcherChokidar,
  ) {}
  async onApplicationBootstrap() {
    // const rootDir = ['../testTxT'];
    const rootDir = 'D:/root';

    const folderPaths = await this.Gc4Service.readRoot(rootDir);    
    const promises = [];
    folderPaths.forEach((item: any) => {
      const promise = this.Gc4Service.readFileContents(item);
      promises.push(promise);
    });
    await Promise.all(promises)
      .then(() => console.log('May GC 4 had read all shortcuts!'))
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
      this.Gc4Service.readFileContents({
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
          'may GC 4 has errorFolderWatchers',
          this.watcherChokidar.errorFolderWatchers,
        );
        this.watcherChokidar.errorFolderWatchers.forEach((data) => {
          this.watcherChokidar.watcherChokidar(data);
        });
      }
      if (this.Gc4Service.errorDir.length > 0) {
        console.log('may GC 4 has errorDir', this.Gc4Service.errorDir);
        this.Gc4Service.errorDir.forEach((data) => {
          const promise = this.Gc4Service.readFileContents(data);
          promisesErrorDir.push(promise);
        });
        await Promise.all(promisesErrorDir).catch((error) =>
          console.error(error),
        );
      }
    }, intervalInMilliseconds);
  }
}
