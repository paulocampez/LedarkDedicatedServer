import { Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';
import { SatisfactoryDedicatedStackProps } from './satisfactoryDedicatedStackProps';

export class SatisfactoryDedicatedStack extends Stack {
  constructor(scope: Construct, id: string, props?: SatisfactoryDedicatedStackProps) {
    super(scope, id, {env: props?.environment});

    // Create a Security Group for the server
    const securityGroup = new ec2.SecurityGroup(this, `${props?.prefix}SatisfactorySecurityGroup`, {
        vpc: ec2.Vpc.fromLookup(this, `${props?.prefix}VPC`, { isDefault: true }),
        description: 'Security Group for the Satisfactory Dedicated Server',
        securityGroupName: `${props?.prefix}-satisfactory`,
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(7777), "Game port")
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(15000), "Beacon port")
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(15777), "Query port")

    // Create an EC2 instance with the latest Amazon Linux AMI and a m5a.xlarge instance type
    const server = new ec2.Instance(this, `${props?.prefix}SatisfactoryDedicatedServer`, {
        //the cheapest machine that i could find that has 16GB of RAM
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.M5A, ec2.InstanceSize.XLARGE),
         // https://discourse.ubuntu.com/t/finding-ubuntu-images-with-the-aws-ssm-parameter-store/15507
        machineImage: ec2.MachineImage.fromSsmParameter("/aws/service/canonical/ubuntu/server/20.04/stable/current/amd64/hvm/ebs-gp2/ami-id"),
        vpc: ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true }),
        keyName: `adminkey`,
        //Get the security group for the server
        securityGroup: securityGroup,
        //ec2 instance will be replaced if the user data changes
        userDataCausesReplacement: true,
        //public subnet
        vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        blockDevices: [
            {
                deviceName: '/dev/sda1',
                volume: ec2.BlockDeviceVolume.ebs(18, {
                    volumeType: ec2.EbsDeviceVolumeType.GP2,
                    deleteOnTermination: true,
                }),
            },
        ],
        
    });

    // Create a bucket for the save files
    const bucket = new s3.Bucket(this, `${props?.prefix}SatisfactoryBucket`, {
        bucketName: props?.bucketName
    });

   // Grant the server read/write access to the bucket
    bucket.grantReadWrite(server);

    // install aws cli on the server
    // unzip the aws cli zip file and install
    server.userData.addCommands('sudo apt-get install unzip -y');
    server.userData.addCommands(
        'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
        'unzip awscliv2.zip',
        './aws/install');

    // install steamcmd on the server
    // https://developer.valvesoftware.com/wiki/SteamCMD?__cf_chl_jschl_tk__=pmd_WNQPOiK18.h0rf16RCYrARI2s8_84hUMwT.7N1xHYcs-1635248050-0-gqNtZGzNAiWjcnBszQiR#Linux
    server.userData.addCommands(
        'mkdir /home/steam',
        'cd /home/steam',
        'sudo add-apt-repository multiverse',
        'sudo apt install software-properties-common',
        'sudo dpkg --add-architecture i386',
        'sudo apt update',
        'sudo apt install -y unzip lib32gcc1 steamcmd',
        'su - ubuntu -c "/usr/games/steamcmd steamcmd +force_install_dir "/home/ubuntu/satisfactory" +login anonymous +app_update 1690800 validate +quit"',
    );
    

    //systemctl satisfactory.service
    const satisfactoryServiceScript = new s3_assets.Asset(this, `${props?.prefix}InstallSystemdSystemService`, {
        path: './lib/scripts/satisfactory.service.sh',
      });
      satisfactoryServiceScript.grantRead(server);
        server.userData.addS3DownloadCommand({
        bucket: satisfactoryServiceScript.bucket,
        bucketKey: satisfactoryServiceScript.s3ObjectKey,
        localFile: '/tmp/satisfactory.service.sh',
        });
        server.userData.addCommands('sudo chmod +x /tmp/satisfactory.service.sh');
        server.userData.addCommands('sudo /tmp/satisfactory.service.sh');
        server.userData.addCommands('sudo systemctl enable satisfactory.service');
        server.userData.addCommands('sudo systemctl start satisfactory.service');
        server.userData.addCommands('sudo systemctl status satisfactory.service');

        
        const autoShutdownServiceScript = new s3_assets.Asset(this, `${props?.prefix}ShutdownSystemService`, {
            path: './lib/scripts/auto-shutdown.service.sh',
          });
          autoShutdownServiceScript.grantRead(server);
            server.userData.addS3DownloadCommand({
            bucket: autoShutdownServiceScript.bucket,
            bucketKey: autoShutdownServiceScript.s3ObjectKey,
            localFile: '/tmp/auto-shutdown.service.sh',
            });
            server.userData.addCommands('sudo chmod +x /tmp/auto-shutdown.service.sh');
            server.userData.addCommands('sudo /tmp/auto-shutdown.service.sh');
            server.userData.addCommands('sudo systemctl enable auto-shutdown.service');
            server.userData.addCommands('sudo systemctl start auto-shutdown.service');
            server.userData.addCommands('sudo systemctl status auto-shutdown.service');
            server.userData.addCommands('sudo systemctl status auto-shutdown.service');
            server.userData.addCommands('chmod +x /home/ubuntu/auto-shutdown.sh');
            server.userData.addCommands('chown ubuntu:ubuntu /home/ubuntu/auto-shutdown.sh');
            server.userData.addCommands(`su - ubuntu -c "crontab -l -e ubuntu | { cat; echo \"*/5 * * * * /usr/local/bin/aws s3 sync /home/ubuntu/.config/Epic/FactoryGame/Saved/SaveGames/server s3://${bucket.bucketName}/ \"; } | crontab -"`);
  }
}
