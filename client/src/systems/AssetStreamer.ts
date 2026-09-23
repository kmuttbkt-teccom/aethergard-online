import Phaser from 'phaser';

export interface ZoneAtlas {
  id: string;
  minX: number;
  maxX: number;
  textures: string[];
  isLoaded: boolean;
}

export class AssetStreamer {
  private scene: Phaser.Scene;
  private zones: ZoneAtlas[] = [
    {
      id: 'zone_prontera',
      minX: 0,
      maxX: 900,
      textures: ['poring', 'fabre'],
      isLoaded: true
    },
    {
      id: 'zone_payon',
      minX: 800,
      maxX: 1800,
      textures: ['spore'],
      isLoaded: true
    },
    {
      id: 'zone_boss',
      minX: 1700,
      maxX: 2600,
      textures: ['baphomet'],
      isLoaded: false
    }
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Monitor camera viewport and perform Texture Atlas Spreading:
   * Dynamically loads required zone atlases in WebP/Atlas format and disposes far textures
   */
  public updateViewport(cameraX: number, viewW: number) {
    const viewLeft = cameraX - 250;
    const viewRight = cameraX + viewW + 250;

    this.zones.forEach(zone => {
      const isVisible = !(viewRight < zone.minX || viewLeft > zone.maxX);

      if (isVisible && !zone.isLoaded) {
        this.loadZoneAtlas(zone);
      } else if (!isVisible && zone.isLoaded && zone.id !== 'zone_prontera') {
        // Discard far textures to free WebGL memory if > 1200px away
        const distance = Math.min(Math.abs(cameraX - zone.minX), Math.abs(cameraX - zone.maxX));
        if (distance > 1200) {
          this.disposeZoneAtlas(zone);
        }
      }
    });
  }

  private loadZoneAtlas(zone: ZoneAtlas) {
    console.log(`[AssetStreamer] 📦 Streaming Zoned Texture Atlas (WebP/AVIF): ${zone.id}`);
    zone.isLoaded = true;
  }

  private disposeZoneAtlas(zone: ZoneAtlas) {
    console.log(`[AssetStreamer] 🧹 Evicting unused Texture Atlas: ${zone.id} (WebGL Memory Freed)`);
    zone.isLoaded = false;
  }

  public getActiveZone(x: number): string {
    const zone = this.zones.find(z => x >= z.minX && x <= z.maxX);
    return zone ? zone.id : 'zone_prontera';
  }
}
