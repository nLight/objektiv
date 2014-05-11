module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      dest: {
        src: ['src/tscope.js'],
        dest: 'dist/tscope.js',
        options: {
          standalone: 'tscope'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('build', ['browserify']);
  grunt.registerTask('default', ['build']);
};
