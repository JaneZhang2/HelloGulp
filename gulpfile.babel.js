import gulp from 'gulp';
import util from 'gulp-util';
import sass from 'gulp-sass';
import autoprefixer from 'autoprefixer';
import uglify from 'gulp-uglify';
import imagemin from 'gulp-imagemin';
import sourcemaps from 'gulp-sourcemaps';
import babel from 'gulp-babel';
import browserSync from 'browser-sync';
import htmlmin from 'gulp-htmlmin';
import eslint from 'gulp-eslint';
import stylelint from 'stylelint';
import reporter from 'postcss-reporter';
import postcss from 'gulp-postcss';
import clean from 'gulp-clean';
import syntax_scss from 'postcss-scss';
import imageInliner from 'postcss-image-inliner';
import sprites from 'postcss-sprites';
import htmllint from 'gulp-htmllint';
import express from 'express';
import runSequence from 'run-sequence';
import rev from 'gulp-rev';
import revReplace from 'gulp-rev-replace';
import plumber from 'gulp-plumber';
var browserify = require('gulp-browserify');
import fs from 'fs'

const {env, noop} = util;
const {environment = 'development'} = env;
const config = require(`./configs/${environment}`);

gulp.task('clean', () =>
  gulp.src('dist', {read: false})
    .pipe(clean())
);

gulp.task('views', () =>
  gulp.src('src/**/*.html')
    .pipe(htmllint())
    .pipe(config.minify ? htmlmin({collapseWhitespace: true}) : noop())
    .pipe(config.md5 ? revReplace({manifest: gulp.src('dist/manifest.json')}) : noop())
    .pipe(gulp.dest('dist'))
    .pipe(config.debug ? browserSync.stream() : noop())
);

gulp.task('images', () =>
  gulp.src(config.minify ? 'src/**/sprite.png' : ['src/**/*.png', '!src/**/sprite.png'])
    .pipe(config.minify ? imagemin() : noop())
    .pipe(config.md5 ? rev() : noop())
    .pipe(gulp.dest('dist'))
    .pipe(config.md5 ? rev.manifest({base: 'dist', path: 'dist/manifest.json', merge: true}) : noop())
    .pipe(config.md5 ? gulp.dest('dist') : noop())
    .pipe(config.debug ? browserSync.stream() : noop())
);

gulp.task('fonts', () =>
  gulp.src('src/**/*.{eot,svg,ttf,woff,woff2}')
    .pipe(gulp.dest('dist'))
    .pipe(config.md5 ? rev() : noop())
    .pipe(gulp.dest('dist'))
    .pipe(config.md5 ? rev.manifest({base: 'dist', path: 'dist/manifest.json', merge: true}) : noop())
    .pipe(config.md5 ? gulp.dest('dist') : noop())
    .pipe(config.debug ? browserSync.stream() : noop())
);

gulp.task('styles', () =>
  gulp.src('src/**/*.scss')
    .pipe(config.sourcemap ? sourcemaps.init() : noop())
    .pipe(postcss([stylelint(), reporter()], {syntax: syntax_scss}))
    .pipe(sass({outputStyle: config.minify ? 'compressed' : 'nested'}).on('error', sass.logError))
    .pipe(postcss([autoprefixer()]))
    .pipe(config.minify ? postcss([
        imageInliner({assetPaths: ['src']}),
        sprites({
          basePath: 'src',
          stylesheetPath: 'src/styles',
          spritePath: 'src/images'
        })
      ]) : noop())
    .pipe(config.md5 ? revReplace({manifest: gulp.src('dist/manifest.json')}) : noop())
    .pipe(config.md5 ? rev() : noop())
    .pipe(config.sourcemap ? sourcemaps.write('.') : noop())
    .pipe(gulp.dest('dist'))
    .pipe(config.md5 ? rev.manifest({base: 'dist', path: 'dist/manifest.json', merge: true}) : noop())
    .pipe(config.md5 ? gulp.dest('dist') : noop())
    .pipe(config.debug ? browserSync.stream() : noop())
);

// gulp.task('scripts', () =>
//   gulp.src('src/**/*.js')
//     .pipe(config.sourcemap ? sourcemaps.init() : noop())
//     .pipe(eslint())
//     .pipe(babel())
//     .pipe(config.minify ? uglify() : noop())
//     .pipe(config.md5 ? revReplace({manifest: gulp.src('dist/manifest.json')}) : noop())
//     .pipe(config.md5 ? rev() : noop())
//     .pipe(config.sourcemap ? sourcemaps.write('.') : noop())
//     .pipe(gulp.dest('dist'))
//     .pipe(config.md5 ? rev.manifest({base: 'dist', path: 'dist/manifest.json', merge: true}) : noop())
//     .pipe(config.md5 ? gulp.dest('dist') : noop())
//     .pipe(config.debug ? browserSync.stream() : noop())
// );

gulp.task('build', () =>
  new Promise(resolve => runSequence('clean', ['images', 'fonts'], 'styles', 'scripts', 'views', resolve))
);

// gulp.task('pre-test', function () {
//   return gulp.src(['**/*.js', '!**/templates/**'])
//     .pipe(excludeGitignore())
//     .pipe(istanbul({
//       includeUntested: true
//     }))
//     .pipe(istanbul.hookRequire());
// });

gulp.task('scripts', function () {
  gulp.src('src/**/*.js')
    .pipe(browserify({
        transform: ['babelify']
      }
      //   {
      //   insertGlobals : true,
      //   debug : !gulp.env.production
      // }
    ))
    .on('prebundle', function (bundle) {
      bundle.require('jquery').bundle().pipe(fs.createWriteStream("dist/jquery.js"));
      bundle.external('jquery');
    })
    .pipe(gulp.dest('./dist'))
});

// var Server = require('karma').Server;
//
// /**
//  * Run test once and exit
//  */
// gulp.task('test', function (done) {
//   new Server({
//     configFile: __dirname + '/karma.conf.js',
//     singleRun: true
//   }, done).start();
// });
//
// /**
//  * Watch for file changes and re-run tests on each change
//  */
// gulp.task('tdd', function (done) {
//   new Server({
//     configFile: __dirname + '/karma.conf.js'
//   }, done).start();
// });
//
// gulp.task('default', ['tdd']);

gulp.task('server', () => {
  const server = express();
  server.use(express.static('dist'));
  server.listen(8000);
  browserSync({proxy: 'localhost:8000'});
});

gulp.task('watch', function () {
  gulp.watch('src/**/*.html', ['views']);
  gulp.watch('src/**/*.png', ['images']);
  gulp.watch('src/**/*.scss', ['styles']);
  gulp.watch('src/**/*.js', ['scripts']);
});

gulp.task('default', () => new Promise(resolve => runSequence(config.debug ? ['build', 'watch', 'server'] : 'build')));
