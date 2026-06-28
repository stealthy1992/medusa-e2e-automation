pipeline {
    agent any

    tools {
        nodejs 'NodeJS-22'
        allure 'allure'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/stealthy1992/medusa-e2e-automation.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install chromium'
            }
        }

        stage('Inject Environment') {
            steps {
                withCredentials([file(credentialsId: 'medusa-e2e-env', variable: 'ENV_FILE')]) {
                    sh 'cp $ENV_FILE .env'
                }
            }
        }

        stage('Playwright - API Tests') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh 'npx playwright test --project=api --reporter=list,allure-playwright'
                }
            }
        }

        stage('Playwright - Storefront Tests') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh 'npx playwright test --project=storefront --reporter=list,allure-playwright'
                }
            }
        }

        stage('Playwright - Admin Tests') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh 'npx playwright test --project=admin --reporter=list,allure-playwright'
                }
            }
        }

        stage('Playwright - Pact Tests') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh 'npx playwright test --project=pact --reporter=list,allure-playwright'
                }
            }
        }

        stage('Playwright - Visual Regression') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh 'npx playwright test --project=visual --reporter=list,allure-playwright'
                }
            }
        }

        stage('DB Assertions') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh 'npx playwright test tests/api/db-assertions.spec.js --project=api --reporter=list,allure-playwright'
                }
            }
        }

        stage('k6 Load Test') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh 'k6 run --out influxdb=http://localhost:8086/k6 k6/medusa-load-test.js'
                }
            }
        }

        stage('ZAP Security Scan') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh '''
                        docker run --rm \
                          -v /opt/zap-medusa-scripts:/zap/scripts/:rw \
                          -v /opt/zap-medusa-reports:/zap/wrk/:rw \
                          -t zaproxy/zap-stable \
                          zap.sh -cmd -autorun /zap/scripts/medusa-autorun.yaml
                    '''
                }
            }
        }
    }

    post {
        always {
            allure([
                includeProperties: false,
                jdk: '',
                properties: [],
                reportBuildPolicy: 'ALWAYS',
                results: [[path: 'allure-results']]
            ])

            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'playwright-report',
                reportFiles: 'index.html',
                reportName: 'Playwright Report'
            ])

            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: '/opt/zap-medusa-reports',
                reportFiles: 'zap-medusa-auth-report.html',
                reportName: 'ZAP Security Report'
            ])
        }

        success {
            echo 'All stages passed.'
        }

        unstable {
            echo 'Some tests failed — build marked UNSTABLE.'
        }

        failure {
            echo 'Pipeline failed — infrastructure or configuration error.'
        }
    }
}
