import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Gc5_report, Gc5_reportSchema } from '../schemas/gc5_report.schema';
import { Gc4_report, Gc4_reportSchema } from '../schemas/gc4_report.schema';
import { Gc3_report, Gc3_reportSchema } from '../schemas/gc3_report.schema';
import { Gc2_report, Gc2_reportSchema } from '../schemas/gc2_report.schema';
import { Gc1_report, Gc1_reportSchema } from '../schemas/gc1_report.schema';
import { Hplc_report, Hplc_reportSchema } from '../schemas/hplc_report.schema';
import { Subject, debounceTime } from 'rxjs';
import { watcherChokidar } from 'src/common/watcher';
import { HplcService } from './hplc.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Hplc_report.name,
        schema: Hplc_reportSchema,
      },
    ]),
  ],
  providers: [HplcService, watcherChokidar],
})
export class HplcModule {
  constructor(
    private HplcService: HplcService,
    private watcherChokidar: watcherChokidar,
  ) {}
  async onApplicationBootstrap() {
    // const rootDir = ['../testTxT'];
    const rootDir = 'D:/root';

    const folderPaths = await this.HplcService.readRoot(rootDir);
    const promises = [];
    folderPaths.forEach((item: any) => {
      const promise = this.HplcService.readFileContents(item);
      promises.push(promise);
    });
    await Promise.all(promises)
      .then(() => console.log('May HPLC had read all shortcuts!'))
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
      this.HplcService.readFileContents({
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
          'may HPLC has errorFolderWatchers',
          this.watcherChokidar.errorFolderWatchers,
        );
        this.watcherChokidar.errorFolderWatchers.forEach((data) => {
          this.watcherChokidar.watcherChokidar(data);
        });
      }
      if (this.HplcService.errorDir.length > 0) {
        console.log('May HPLC has errorDir', this.HplcService.errorDir);
        this.HplcService.errorDir.forEach((data) => {
          const promise = this.HplcService.readFileContents(data);
          promisesErrorDir.push(promise);
        });
        await Promise.all(promisesErrorDir).catch((error) =>
          console.error(error),
        );
      }
    }, intervalInMilliseconds);
  }
}
