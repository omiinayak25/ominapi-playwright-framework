// =============================================================================
// Jenkinsfile — OminAPI pipeline (Declarative)
// -----------------------------------------------------------------------------
// Mirrors the GitHub Actions gates for teams on Jenkins: install -> quality
// gate -> tests -> publish JUnit results & archive HTML/Allure artifacts.
// =============================================================================
pipeline {
  agent {
    docker { image 'node:22-bookworm-slim' }
  }

  options {
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  environment {
    CI = 'true'
  }

  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Quality gate') {
      // Static checks run in parallel; any failure fails the build.
      parallel {
        stage('Typecheck') { steps { sh 'npm run typecheck' } }
        stage('Lint')      { steps { sh 'npm run lint' } }
        stage('Format')    { steps { sh 'npm run format:check' } }
      }
    }

    stage('Test') {
      steps {
        sh 'npm run test:ci'
      }
    }
  }

  post {
    always {
      // Publish machine-readable results and keep human-readable artifacts.
      junit testResults: 'test-results/junit-results.xml', allowEmptyResults: true
      archiveArtifacts artifacts: 'playwright-report/**, allure-results/**, test-results/summary.json',
                       allowEmptyArchive: true
    }
  }
}
