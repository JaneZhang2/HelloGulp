import gulp from 'gulp';
import sass from 'gulp-sass';
import autoprefixer from 'autoprefixer';
import uglify from 'gulp-uglify';
import imagemin from 'gulp-imagemin';
import sourcemaps from 'gulp-sourcemaps';
import browserSync from 'browser-sync';
import htmlmin from 'gulp-htmlmin';
import eslint from 'gulp-eslint';
import stylelint from 'stylelint';
import reporter from 'postcss-reporter';
import postcss from 'gulp-postcss';
import syntax_scss from 'postcss-scss';
import imageInliner from 'postcss-image-inliner';
import sprites from 'postcss-sprites';
import htmllint from 'gulp-htmllint';
import express from 'express';
import rev from 'gulp-rev';
import revReplace from 'gulp-rev-replace';
import plumber from 'gulp-plumber';
import browserify from 'browserify';
import gulpif from 'gulp-if';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import {dependencies} from './package.json';
import exorcist from 'exorcist';
import path from 'path';
import {Server} from 'karma';
import del from 'del';
import gutil from 'gulp-util';
import glob from 'glob';

const {env} = gutil;
const {environment = 'development'} = env;
const config = require(`./configs/${environment}`);

gulp.task('clean', () => del('dist'));

gulp.task('views', () =>
  gulp.src('src/**/*.html')
    .pipe(htmllint({failOnError: true}))
    .pipe(plumber())
    .pipe(gulpif(config.minify, htmlmin({collapseWhitespace: true})))
    .pipe(gulpif(!config.debug, revReplace({manifest: gulp.src('dist/manifest.json', {allowEmpty: true})})))
    .pipe(gulp.dest('dist'))
    .pipe(gulpif(config.debug, browserSync.stream()))
);

gulp.task('images', () =>
  gulp.src('src/**/sprite.png')
    .pipe(gulpif(config.minify, imagemin()))
    .pipe(gulpif(!config.debug, rev()))
    .pipe(gulp.dest('dist'))
    .pipe(gulpif(!config.debug, rev.manifest({base: 'dist', path: 'dist/manifest.json', merge: true})))
    .pipe(gulpif(!config.debug, gulp.dest('dist')))
    .pipe(gulpif(config.debug, browserSync.stream()))
);

gulp.task('fonts', () =>
  gulp.src('src/**/*.{eot,svg,ttf,woff,woff2}')
    .pipe(gulp.dest('dist'))
    .pipe(gulpif(!config.debug, rev()))
    .pipe(gulp.dest('dist'))
    .pipe(gulpif(!config.debug, rev.manifest({base: 'dist', path: 'dist/manifest.json', merge: true})))
    .pipe(gulpif(!config.debug, gulp.dest('dist')))
    .pipe(gulpif(config.debug, browserSync.stream()))
);

gulp.task('stylelint', () =>
  gulp.src('src/**/*.scss')
    .pipe(postcss([stylelint(), reporter({throwError: true})], {syntax: syntax_scss}))
);

gulp.task('styles', gulp.series('stylelint', () =>
  gulp.src('src/**/*.scss')
    .pipe(gulpif(config.sourcemap, sourcemaps.init()))
    .pipe(sass({outputStyle: config.minify ? 'compressed' : 'nested'}).on('error', sass.logError))
    .pipe(postcss([
      autoprefixer(),
      imageInliner({assetPaths: ['src']}),
      sprites({
        basePath: 'src',
        stylesheetPath: 'src/styles',
        spritePath: 'src/images'
      })
    ]))
    .pipe(gulpif(!config.debug, revReplace({manifest: gulp.src('dist/manifest.json', {allowEmpty: true})})))
    .pipe(gulpif(!config.debug, rev()))
    .pipe(gulpif(config.sourcemap, sourcemaps.write('.')))
    .pipe(gulp.dest('dist'))
    .pipe(gulpif(!config.debug, rev.manifest({base: 'dist', path: 'dist/manifest.json', merge: true})))
    .pipe(gulpif(!config.debug, gulp.dest('dist')))
    .pipe(gulpif(config.debug, browserSync.stream()))
));

gulp.task('eslint', () =>
  gulp.src('src/**/*.js')
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
);

gulp.task('vendors', () =>
  browserify()
    .require(Object.keys(dependencies))
    .bundle()
    .pipe(source('scripts/vendors.js')) // gives streaming vinyl file object
    .pipe(buffer()) // <----- convert from streaming to buffered vinyl file object
    .pipe(gulpif(!config.debug, uglify())) // now gulp-uglify works
    .pipe(gulpif(!config.debug, revReplace({manifest: gulp.src('dist/manifest.json', {allowEmpty: true})})))
    .pipe(gulpif(!config.debug, rev()))
    .pipe(gulp.dest('dist'))
    .pipe(gulpif(!config.debug, rev.manifest({base: 'dist', path: 'dist/manifest.json', merge: true})))
    .pipe(gulpif(!config.debug, gulp.dest('dist')))
    .pipe(gulpif(config.debug, browserSync.stream()))
);

gulp.task('scripts', gulp.series('eslint', 'vendors', () =>
  Promise.all(glob.sync('src/**/index.js').map((file) =>
    browserify('src/scripts/index.js', {debug: config.debug, transform: 'babelify'})
      .external(Object.keys(dependencies))
      .bundle()
      .pipe(exorcist(path.join(__dirname, 'dist/scripts/bundle.js.map')))
      .pipe(source(file.replace(/^src\//, ''))) // gives streaming vinyl file object
      .pipe(buffer()) // <----- convert from streaming to buffered vinyl file object
      .pipe(gulpif(!config.debug, uglify())) // now gulp-uglify works
      .pipe(gulpif(!config.debug, revReplace({manifest: gulp.src('dist/manifest.json', {allowEmpty: true})})))
      .pipe(gulpif(!config.debug, rev()))
      .pipe(gulp.dest('dist'))
      .pipe(gulpif(!config.debug, rev.manifest({base: 'dist', path: 'dist/manifest.json', merge: true})))
      .pipe(gulpif(!config.debug, gulp.dest('dist')))
      .pipe(gulpif(config.debug, browserSync.stream())))
  )
));

gulp.task('lint', gulp.series('stylelint', 'eslint'));

gulp.task('test', function (done) {
  new Server({configFile: __dirname + '/karma.conf.js'}, done).start();
});

gulp.task('build', gulp.series('clean', 'images', 'fonts', 'vendors', 'styles', 'scripts', 'views'));

gulp.task('watch', () => {
  gulp.watch('src/**/*.html', gulp.series('views'));
  gulp.watch('src/**/*.png', gulp.series('images'));
  gulp.watch('src/**/*.scss', gulp.series('styles'));
  gulp.watch('src/**/*.js', gulp.series('scripts'));
});

gulp.task('server', () => {
  const server = express();
  server.use(express.static('dist'));
  server.listen(8000);
  browserSync({proxy: 'localhost:8000'});
});

gulp.task('default', gulp.series('build', gulp.parallel('watch', 'server')));
