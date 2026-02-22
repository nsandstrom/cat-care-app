import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import { CfnSchedule } from 'aws-cdk-lib/aws-scheduler';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class CatCareStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── DynamoDB ─────────────────────────────────────────────────────
    const table = new dynamodb.Table(this, 'CatCareTable', {
      tableName: 'CatCareTable',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    // ── SSM Parameter for household token ───────────────────────────
    const householdTokenParam = new ssm.StringParameter(this, 'HouseholdToken', {
      parameterName: '/cat-care/household-token',
      stringValue: process.env.HOUSEHOLD_TOKEN ?? 'change-me-after-deploy',
      description: 'Shared household token for cat care app authentication',
    });

    // ── Common Lambda environment ─────────────────────────────────
    // HOUSEHOLD_TOKEN is injected directly as an env var (from CDK deploy env).
    // SSM param is kept as a management record but not read at Lambda runtime.
    const lambdaEnv: Record<string, string> = {
      TABLE_NAME: table.tableName,
      HOUSEHOLD_TOKEN: process.env.HOUSEHOLD_TOKEN ?? householdTokenParam.stringValue,
      APP_PASSWORD: process.env.APP_PASSWORD ?? process.env.HOUSEHOLD_TOKEN ?? 'change-me-after-deploy',
    };

    // ── API Lambda ────────────────────────────────────────────────
    const apiLambda = new lambdaNodejs.NodejsFunction(this, 'ApiHandler', {
      functionName: 'cat-care-api',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../../backend/src/handlers/api.ts'),
      handler: 'handler',
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(29),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node22',
        externalModules: ['@aws-sdk/*'],
      },
    });

    table.grantReadWriteData(apiLambda);
    householdTokenParam.grantRead(apiLambda);

    // ── Summarise Lambda ──────────────────────────────────────────
    const summariseLambda = new lambdaNodejs.NodejsFunction(this, 'SummariseHandler', {
      functionName: 'cat-care-summarise',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../../backend/src/handlers/summarise.ts'),
      handler: 'handler',
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(60),
      memorySize: 128,
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node22',
        externalModules: ['@aws-sdk/*'],
      },
    });

    table.grantReadWriteData(summariseLambda);
    householdTokenParam.grantRead(summariseLambda);

    // IAM role for EventBridge Scheduler to invoke the Lambda
    const schedulerRole = new iam.Role(this, 'SummariseSchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
      inlinePolicies: {
        InvokeSummarise: new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [summariseLambda.functionArn],
          })],
        }),
      },
    });

    // Allow scheduler service to invoke the Lambda
    summariseLambda.addPermission('SchedulerInvoke', {
      principal: new iam.ServicePrincipal('scheduler.amazonaws.com'),
      sourceAccount: this.account,
    });

    // Daily summarise at 04:00 Europe/Stockholm
    new CfnSchedule(this, 'DailySummariseSchedule', {
      name: 'cat-care-daily-summarise',
      description: 'Triggers cat care daily summary at 04:00 Europe/Stockholm',
      scheduleExpression: 'cron(0 4 * * ? *)',
      scheduleExpressionTimezone: 'Europe/Stockholm',
      flexibleTimeWindow: { mode: 'OFF' },
      target: {
        arn: summariseLambda.functionArn,
        roleArn: schedulerRole.roleArn,
      },
    });

    // ── HTTP API Gateway ──────────────────────────────────────────
    const httpApi = new apigatewayv2.HttpApi(this, 'CatCareApi', {
      apiName: 'cat-care-api',
      description: 'Cat Care REST API',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'X-Household-Token', 'X-Api-Key'],
        maxAge: cdk.Duration.days(1),
      },
    });

    const apiIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'ApiIntegration',
      apiLambda,
    );

    // Routes
    httpApi.addRoutes({ path: '/auth', methods: [apigatewayv2.HttpMethod.POST], integration: apiIntegration });
    httpApi.addRoutes({ path: '/tasks', methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.POST], integration: apiIntegration });
    httpApi.addRoutes({ path: '/tasks/{taskId}', methods: [apigatewayv2.HttpMethod.PUT, apigatewayv2.HttpMethod.DELETE], integration: apiIntegration });
    httpApi.addRoutes({ path: '/checklist/{date}', methods: [apigatewayv2.HttpMethod.GET], integration: apiIntegration });
    httpApi.addRoutes({ path: '/checklist/{date}/{taskId}', methods: [apigatewayv2.HttpMethod.POST, apigatewayv2.HttpMethod.DELETE], integration: apiIntegration });
    httpApi.addRoutes({ path: '/history', methods: [apigatewayv2.HttpMethod.GET], integration: apiIntegration });

    // ── S3 + CloudFront ───────────────────────────────────────────
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `cat-care-frontend-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    const oac = new cloudfront.S3OriginAccessControl(this, 'SiteOAC', {
      description: 'OAC for Cat Care frontend',
    });

    const urlRewriteFn = new cloudfront.Function(this, 'UrlRewrite', {
      comment: 'Rewrite directory paths to index.html for Next.js static export',
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var uri = event.request.uri;
  if (uri.endsWith('/')) {
    event.request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    event.request.uri += '/index.html';
  }
  return event.request;
}
`),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      comment: 'Cat Care frontend',
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(siteBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        functionAssociations: [{
          function: urlRewriteFn,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    // Grant CloudFront OAC access to S3
    siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        actions: ['s3:GetObject'],
        resources: [siteBucket.arnForObjects('*')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
          },
        },
      }),
    );

    // ── Outputs ───────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.url ?? '',
      description: 'HTTP API base URL',
      exportName: 'CatCareApiUrl',
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
      exportName: 'CatCareFrontendUrl',
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: siteBucket.bucketName,
      description: 'S3 bucket for frontend assets',
      exportName: 'CatCareBucketName',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: 'CatCareDistributionId',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
      description: 'DynamoDB table name',
      exportName: 'CatCareTableName',
    });
  }
}
