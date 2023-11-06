import { Module } from '@nestjs/common';
import { ReadReportService } from './read-report.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Gc5_report, Gc5_reportSchema } from '../schemas/gc5_report.schema';
import { Gc4_report, Gc4_reportSchema } from '../schemas/gc4_report.schema';
import { Gc3_report, Gc3_reportSchema } from '../schemas/gc3_report.schema';
import { Gc2_report, Gc2_reportSchema } from '../schemas/gc2_report.schema';
import { Gc1_report, Gc1_reportSchema } from '../schemas/gc1_report.schema';
import { Hplc_report, Hplc_reportSchema } from '../schemas/hplc_report.schema';
import { Subject, debounceTime } from 'rxjs';
import { watcherChokidar } from 'src/common/watcher';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Gc5_report.name,
        schema: Gc5_reportSchema,
      },
      {
        name: Gc4_report.name,
        schema: Gc4_reportSchema,
      },
      {
        name: Gc3_report.name,
        schema: Gc3_reportSchema,
      },
      {
        name: Gc2_report.name,
        schema: Gc2_reportSchema,
      },

      {
        name: Gc1_report.name,
        schema: Gc1_reportSchema,
      },
      {
        name: Hplc_report.name,
        schema: Hplc_reportSchema,
      },
    ]),
  ],
  providers: [ReadReportService, watcherChokidar],
})
export class ReadReportModule {
  constructor(
    private reportService: ReadReportService,
    private watcherChokidar: watcherChokidar,
  ) {}
  async onApplicationBootstrap() {
    // const rootDir = ['../testTxT'];
    const rootDir = 'D:/root';

    const folderPaths = await this.reportService.readRoot(rootDir);    
    const promises = [];
    folderPaths.forEach((item: any) => {
      const promise = this.reportService.readFileContents(item);
      promises.push(promise);
    });
    await Promise.all(promises)
      .then(() => console.log('Report had read all shortcuts!'))
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
      this.reportService.readFileContents({
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
          'errorFolderWatchers',
          this.watcherChokidar.errorFolderWatchers,
        );
        this.watcherChokidar.errorFolderWatchers.forEach((data) => {
          this.watcherChokidar.watcherChokidar(data);
        });
      }
      if (this.reportService.errorDir.length > 0) {
        console.log('errorDir', this.reportService.errorDir);
        this.reportService.errorDir.forEach((data) => {
          const promise = this.reportService.readFileContents(data);
          promisesErrorDir.push(promise);
        });
        await Promise.all(promisesErrorDir).catch((error) =>
          console.error(error),
        );
      }
    }, intervalInMilliseconds);
  }
}
