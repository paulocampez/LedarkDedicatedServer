import * as cdk from 'aws-cdk-lib';

// Description: Props for the Satisfactory Dedicated Server Stack
export interface SatisfactoryDedicatedStackProps {
    /**
     * Description: The name of the S3 bucket that will be used to store the save files.
     * @param bucketName
     * @typedef string
     * @example "satisfactory"
    */
    bucketName: string;

    /**
     * Description: The name of the S3 bucket that will be used to store the save files.
     * @param environment
     * @interface cdk.Environment
     * @example { account: '123456789012', region: 'us-east-1' }
    */
    environment: cdk.Environment;

    /**
     * Description: Prefix of the services that will be created. This is used to create unique names for the services.
     * @param prefix
     * @typedef string
     * @example "satisfactory"
    */
    prefix?: string;
}