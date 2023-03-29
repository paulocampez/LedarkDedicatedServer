#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SatisfactoryDedicatedStack } from '../lib/SatisfactoryDedicatedStack/satisfactoryDedicatedStack';
import { SatisfactoryDedicatedStackProps } from '../lib/SatisfactoryDedicatedStack/satisfactoryDedicatedStackProps';

const app = new cdk.App();

const dedicatedServerProps: SatisfactoryDedicatedStackProps = {
    bucketName: "satisfactory-bucket",
    environment: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    prefix: "dev-SAE-1"
};

                               //Construct, StackId, Props
new SatisfactoryDedicatedStack(app, 'LedarkDedicatedServerStack', dedicatedServerProps);
