import {createRequire} from 'node:module';
const {build}=createRequire(import.meta.url)('esbuild');
// These three versioned public catalogs are shared with the original exercise pages.
const catalogs=/data\/(packed-battle-frames|supplied-audio|teacher-recordings)\.js\?v=[\w-]+$/;
const sharedCatalogs={
  name:'published-island-catalogs',
  setup(builder){
    builder.onResolve({filter:catalogs},args=>({
      path:'./data/'+args.path.split('/').pop(),external:true
    }));
  }
};
const options={bundle:true,minify:true,format:'esm',target:'safari15'};
await build({...options,define:{__BAISHA_BUILD__:'true'},entryPoints:['adventure-preview.js'],outfile:'adventure-candidate-baisha-v1.bundle.js',charset:'utf8',plugins:[sharedCatalogs]});
await build({...options,define:{__BAISHA_BUILD__:'false'},entryPoints:['adventure-preview.js'],outfile:'adventure-play.bundle.js',charset:'utf8',plugins:[sharedCatalogs]});
await build({...options,entryPoints:['adventure-entry.js'],outfile:'adventure-entry.bundle.js',external:['./adventure-play.bundle.js*']});