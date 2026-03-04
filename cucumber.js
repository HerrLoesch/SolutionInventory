module.exports = {
  default: {
    require: [
      'tests/support/**/*.js',
      'tests/step_definitions/**/*.js',
    ],
    paths: ['tests/features/**/*.feature'],
    format: [
      'progress-bar',
      'html:cucumber-report.html',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
    },
  },
}
