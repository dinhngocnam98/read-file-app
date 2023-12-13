import { Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Gc3_report, Gc3_reportSchema } from '../schemas/Gc3_report.schema';
import { watcherChokidar } from 'src/common/watcher';
import { Gc3Service } from './Gc3.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Gc3_report.name,
        schema: Gc3_reportSchema,
      },
    ]),
  ],
  providers: [Gc3Service, watcherChokidar],
})
export class Gc3Module {
  constructor(
    private Gc3Service: Gc3Service,
    private watcherChokidar: watcherChokidar,
  ) {}
  async onApplicationBootstrap() {
    const logger = new Logger('MAY GC 3');
    // const rootDir = 'D:/root';

    // const folderPaths = await this.Gc3Service.readRoot(rootDir);
    const promises = [];
    const folderPaths = [{ folder_dir: 'D:/DATA', device: 'MAY GC 3' }];
    folderPaths.forEach((item: any) => {
      const promise = this.Gc3Service.readFileContents(item);
      promises.push(promise);
    });
    await Promise.all(promises)
      .then(() => logger.log('May GC 3 had read all shortcuts!'))
      .catch((error) => logger.error(error));

    // Theo dõi sự thay đổi trong thư mục và cập nhật nội dung của các tệp tin .txt
    folderPaths.forEach((data: any) => {
      this.watcherChokidar.watcherChokidar(data);
    });

    this.watcherChokidar.watchers.forEach((data: any) => {
      data.watcher.on('addDir', (path: string) => {
        logger.log('addDir: ', path);
        let pathEdit = path.replace(/\\/g, '/');
        if (pathEdit.toUpperCase().endsWith('DA.M')) {
          const lastSlashIndex = pathEdit.lastIndexOf('/');
          pathEdit =
            lastSlashIndex !== -1
              ? pathEdit.substring(0, lastSlashIndex)
              : pathEdit;
        }
        this.Gc3Service.readFileContents({
          folder_dir: pathEdit,
          device: data.device,
        });
      });
      data.watcher.on('add', (path: string) => {
        logger.log('add: ', path);
        const pathEdit = path.replace(/\\/g, '/');
        this.Gc3Service.readFileContents({
          folder_dir: pathEdit,
          device: data.device,
        });
      });
      data.watcher.on('change', (path: string) => {
        logger.log('change: ', path);
        const pathEdit = path.replace(/\\/g, '/');
        this.Gc3Service.readFileContents({
          folder_dir: pathEdit,
          device: data.device,
        });
      });
    });

    // // //Doc lai file loi
    const intervalInMilliseconds = 15 * 60 * 1000;
    setInterval(async () => {
      const promisesErrorDir = [];

      if (this.watcherChokidar.errorFolderWatchers.length > 0) {
        logger.warn(
          'May GC 3 has errorFolderWatchers',
          this.watcherChokidar.errorFolderWatchers,
        );
        this.watcherChokidar.errorFolderWatchers.forEach((data) => {
          this.watcherChokidar.watcherChokidar(data);
        });
      }
      if (this.Gc3Service.errorDir.length > 0) {
        logger.warn('May GC 3 has errorDir', this.Gc3Service.errorDir);
        this.Gc3Service.errorDir.forEach((data) => {
          const promise = this.Gc3Service.readFileContents(data);
          promisesErrorDir.push(promise);
        });
        await Promise.all(promisesErrorDir).catch((error) =>
          logger.error(error),
        );
      }
    }, intervalInMilliseconds);
  }
}
