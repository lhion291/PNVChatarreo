import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Gallery, GalleryItem, ImageItem, ThumbnailsPosition, ImageSize } from '@ngx-gallery/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';

import { ArchivoAdjuntarComponent } from 'app/modals/archivo-adjuntar/archivo-adjuntar.component';

import { ProcesoService } from 'app/services/proceso.service';
import { ArchivoService } from 'app/services/archivo.service';
import { ProcesoEtapaService } from 'app/services/proceso-etapa.service';

import { Proceso } from 'app/models/proceso.model';
import { ArchivoEtapa } from 'app/models/archivoEtapa.model';
import { Checklist } from 'app/models/checklist.model';
import { InitEtapaRequest } from 'app/models/itEtapaRequest.model';
import { FinEtapaRequest } from 'app/models/fEtapaRequest.model';
import { IArchivoRequest } from 'app/models/iarchivoRequest.model';
import { ObservacionRequest } from 'app/models/observacionRequest.model';

import Swal from 'sweetalert2';
import { PchService } from '../../services/pch.service';

@Component({
  selector: 'app-verificacion-fisica-editar',
  templateUrl: './verificacion-fisica-editar.component.html',
  styles: [
  ]
})

export class VerificacionFisicaEditarComponent implements OnInit {

  form_etapa: FormGroup;
  proceso_obtenido: Proceso;
  ietapa: InitEtapaRequest;
  fetapa: FinEtapaRequest;
  iarchivo_request: IArchivoRequest;
  observacion_request: ObservacionRequest;

  items: GalleryItem[];
  archivos_etapa: ArchivoEtapa[];
  archivos_aprobados: ArchivoEtapa[] = [];
  checklist: Checklist[];
  checklist_request: Checklist[];

  proceso_token: string;
  estado_proceso: string;
  tipo_observacion: string;
  descripcion_obs: string = '';
  mostrar_boton_add_img: boolean = true;
  deshabilitar_obs: boolean = false;

  fecha_maxima: string = '';
  fecha_minima: string;
  hora_minima: string;
  fecha_fin: string;

  fecha_inicio: string = '';
  hora_inicio: string = '';

  pgm_chatarreo: string;

  constructor(
    public gallery: Gallery,
    public _dialog: MatDialog,
    private _activatedRoute: ActivatedRoute,
    private _procesoService: ProcesoService,
    private _archivoService: ArchivoService,
    private _procesoEtapaService : ProcesoEtapaService,
    private _router: Router,
    private _pchService: PchService
  ) {
    console.clear();
    this.tipo_observacion = 'D';
    this.proceso_token = '';
    this.estado_proceso = '';
    this.proceso_obtenido = {};
    this.ietapa = {};
    this.fetapa = {};
    this.iarchivo_request = {};
    this.observacion_request = {};
    this.checklist = [];
    this.checklist_request = [];
    this.items = [];
  }

  ngOnInit(): void {
    this.obtener_fecha_maxima();
    this.crear_formulario();
    this._activatedRoute.paramMap.subscribe((params: ParamMap) => {
      this.proceso_token = params.get('token');
      this.obtener_proceso_token(this.proceso_token);
    }); 

    this.checklist_request = [];
    this.recibir_lista_archivos();
    this.basicLightboxExample(); // Load items into the lightbox
    this.withCustomGalleryConfig(); // Load item into different lightbox instance with custom gallery config
  }

  setear_fecha_hora_inicio(fecha: string) {
    this.fecha_inicio = this.convertir_fecha(fecha);
    this.hora_inicio = this.convertir_hora(fecha);
    this.fecha_fin = this.fecha_inicio;
  }

  obtener_fecha_maxima() {
    const today = new Date();
    this.fecha_maxima = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
  }

  obtener_fecha_minima() {
    this.fecha_minima = this.form_etapa.get('fecha_inicio').value;
    this.fecha_fin = this.fecha_minima;
  }

  obtener_hora_minima() {

    const fecha_inicio = this.form_etapa.get('fecha_inicio').value;
    const fecha_fin = this.form_etapa.get('fecha_fin').value;
    const hora_inicio = this.form_etapa.get('hora_inicio').value;
    
    if(fecha_fin === fecha_inicio) {
      console.log(hora_inicio);
      this.hora_minima = hora_inicio;
      return;
    }

    this.hora_minima = '00:00';

  }

  obtener_proceso_token(token: string) {
    this._procesoService.obtener_proceso_token(encodeURIComponent(token))
    .subscribe( (resp: Proceso) => {
      console.table(resp);
      this.proceso_obtenido = resp;
      this.archivos_etapa = this.proceso_obtenido.Etapa.TipoArchivos;
      this.estado_proceso = this.proceso_obtenido.ProcesoEtapa.Estado;
      this.tipo_observacion ='D';
      this.obtener_estado_observacion(this.estado_proceso || 'D');
      this.checklist = this.proceso_obtenido.ProcesoEtapa.Checklist;
      this.setear_formulario(this.proceso_obtenido);
      this.deshabilitar_inputs();
      this.setImagenes();

      if(resp.ProcesoEtapa.Estado === 'O') {
        this.setear_fecha_hora_inicio(resp.ProcesoEtapa.FechaInicio);
      }
      
    });
  }

  recibir_lista_archivos() {
    this._archivoService.lista_archivos_enviar.subscribe({
      next: (resp) => {
        this.archivos_aprobados = resp
        const ultimo_archivo_aprobado: ArchivoEtapa = this.archivos_aprobados[this.archivos_aprobados.length - 1];

        this.archivos_etapa.map( archivo => {
            if(archivo.Descripcion === ultimo_archivo_aprobado.Descripcion) {
                archivo.archivo_adjunto = ultimo_archivo_aprobado.archivo_adjunto;
                if(ultimo_archivo_aprobado.Subtipo === 'E'){
                  this.previewImage(ultimo_archivo_aprobado);
                }
            }
        });

      }
    })
  }

  guardar_etapa() {

    console.log(this.estado_proceso);
    const obs_comentada = this.form_etapa.value.descripcion_obs || ''; 

    

    const fecha_inicio = this.form_etapa.get('fecha_inicio').value;
    const fecha_fin = this.form_etapa.get('fecha_fin').value;
    const hora_inicio = this.form_etapa.get('hora_inicio').value;
    const hora_fin = this.form_etapa.get('hora_fin').value;

    if(this.estado_proceso === 'O') {

      if(this.tipo_observacion != 'S') {
        Swal.fire({
          text: 'Debe de subsanar la etapa',
          width: 350,
          padding: 15,
          timer: 2000,
          allowOutsideClick: false,
          showConfirmButton: false,
          icon: 'error'
        });  
        return;
      } else if(this.descripcion_obs.length === 0) {
        Swal.fire({
          text: 'Debe colocar un comentario de subsanación',
          width: 350,
          padding: 15,
          timer: 2000,
          allowOutsideClick: false,
          showConfirmButton: false,
          icon: 'error'
        });  
        return;
      }  
      
    }

    if(this.tipo_observacion === 'O') {

      if(obs_comentada.length === 0) {
        Swal.fire({
          text: 'Debe colocar una observación',
          width: 350,
          padding: 15,
          timer: 2000,
          allowOutsideClick: false,
          showConfirmButton: false,
          icon: 'error'
        });  
        return;
      } else if (!fecha_inicio) {
        Swal.fire({
          text: 'Seleccione una fecha de inicio',
          width: 350,
          padding: 15,
          timer: 2000,
          allowOutsideClick: false,
          showConfirmButton: false,
          icon: 'error'
        });  
        return;
      } else if (!hora_inicio) {
        Swal.fire({
          text: 'Seleccione una hora de inicio',
          width: 350,
          padding: 15,
          timer: 2000,
          allowOutsideClick: false,
          showConfirmButton: false,
          icon: 'error'
        });  
        return;
      }

    } else {

      if(this.form_etapa.invalid) {
        Swal.fire({
          text: 'Debe de llenar correctamente el formulario',
          width: 350,
          padding: 15,
          timer: 2000,
          allowOutsideClick: false,
          showConfirmButton: false,
          icon: 'error'
        })
        return;
      }
       if(fecha_inicio === fecha_fin) {
        if(hora_fin < hora_inicio) {
          Swal.fire({
            text: 'La fecha y hora fin no debe ser menor a la inicial',
            width: 350,
            padding: 15,
            timer: 3000,
            allowOutsideClick: false,
            showConfirmButton: false,
            icon: 'error'
          });
          return;
        }
      } 
       if(this.checklist_request.length !== this.checklist.length) {
        Swal.fire({
          text: 'Debe de seleccionar todos los items del Checklist',
          width: 350,
          padding: 15,
          timer: 2000,
          allowOutsideClick: false,
          showConfirmButton: false,
          icon: 'error'
        })
        return;
      } 

    }

    if(this.tipo_observacion === 'O') {

    // Request Object Iniciar Etapa
    this.ietapa.IdProceso = this.proceso_obtenido.IdProceso;
    this.ietapa.IdEtapa = this.proceso_obtenido.Etapa.IdEtapa;
    this.ietapa.FechaInicio = this.obtener_fecha_inicial();
    this.ietapa.Estado = 'A';

    this._procesoEtapaService.iniciar_etapa(this.ietapa).
    subscribe(resp_ietapa => {

      for(let i = 0; i < this.archivos_aprobados.length; i++) {
        this.iarchivo_request = {};
        this.iarchivo_request.IdProceso = this.proceso_obtenido.IdProceso;
        this.iarchivo_request.IdEtapa = this.proceso_obtenido.Etapa.IdEtapa;
        this.iarchivo_request.IdTipoArchivo = this.archivos_aprobados[i].IdTipoArchivo;
        this.iarchivo_request.Nombre = this.archivos_aprobados[i].archivo_adjunto.name;

        this._archivoService.insertar_archivo(this.iarchivo_request)
          .subscribe((resp_token: string) => {
            this._archivoService.cargar_archivo(encodeURIComponent(resp_token), this.archivos_aprobados[i].archivo_adjunto)
              .subscribe(resp => {
                console.log('archivo cargado...');
              },
              (error: any) => {
                Swal.fire({
                  text: 'Ocurrió un problema al cargar el archivo ' + this.archivos_aprobados[i].archivo_adjunto.name,
                  width: 350,
                  padding: 15,
                  timer: 2000,
                  allowOutsideClick: false,
                  showConfirmButton: false,
                  icon: 'error'
                });
                return;
              });
          });
      }            

    });

      this.observacion_request.IdProceso = this.proceso_obtenido.IdProceso;
      this.observacion_request.IdEtapa = this.proceso_obtenido.Etapa.IdEtapa;
      this.observacion_request.Observacion = (<HTMLInputElement>document.getElementById('obs_desc')).value;
      this.observacion_request.Estado = this.tipo_observacion;
      
      this._procesoEtapaService.observar_etapa(this.observacion_request)
      .subscribe(resp_obs => {
        Swal.fire({
          text: 'Verificación Observada',
          width: 350,
          padding: 15,
          timer: 3000,
          allowOutsideClick: false,
          showConfirmButton: false,
          icon: 'success'
        }).then( result => {
          this.volverEtapa();
        });
          return;
      });
    } else if (this.tipo_observacion === 'S') {

      // Request Object Finalizar Etapa
      this.fetapa.IdProceso = this.proceso_obtenido.IdProceso;
      this.fetapa.IdEtapa = this.proceso_obtenido.Etapa.IdEtapa;
      this.fetapa.ChatarraPeso = Number(this.proceso_obtenido.ProcesoEtapa.VehiculoPeso);
      this.fetapa.VehiculoPeso = Number(this.form_etapa.value.peso_real);
      this.fetapa.FechaInicio =  this.proceso_obtenido.ProcesoEtapa.FechaInicio;
      this.fetapa.FechaFin = this.obtener_fecha_final();
      this.fetapa.Estado = 'T';
      this.fetapa.Checklist = this.checklist_request;
      this.fetapa.Observacion = this.descripcion_obs

      this._procesoEtapaService.finalizar_etapa(this.fetapa).
      subscribe( resp_fetapa => {
        this.descargar_informe();
        Swal.fire({
          text: 'Verificación Física finalizada',
          width: 350,
          padding: 15,
          timer: 3000,
          allowOutsideClick: false,
          showConfirmButton: false,
          icon: 'success'
        }).then( result => {
          this.volverEtapa();
        });

        return
        
      });

    }   
    else {

    // Request Object Iniciar Etapa
    this.ietapa.IdProceso = this.proceso_obtenido.IdProceso;
    this.ietapa.IdEtapa = this.proceso_obtenido.Etapa.IdEtapa;
    this.ietapa.FechaInicio = this.obtener_fecha_inicial();
    this.ietapa.Estado = 'A';

    this._procesoEtapaService.iniciar_etapa(this.ietapa).
    subscribe(resp_ietapa => {

      for(let i = 0; i < this.archivos_aprobados.length; i++) {
        this.iarchivo_request = {};
        this.iarchivo_request.IdProceso = this.proceso_obtenido.IdProceso;
        this.iarchivo_request.IdEtapa = this.proceso_obtenido.Etapa.IdEtapa;
        this.iarchivo_request.IdTipoArchivo = this.archivos_aprobados[i].IdTipoArchivo;
        this.iarchivo_request.Nombre = this.archivos_aprobados[i].archivo_adjunto.name;

        this._archivoService.insertar_archivo(this.iarchivo_request)
          .subscribe((resp_token: string) => {
            this._archivoService.cargar_archivo(encodeURIComponent(resp_token), this.archivos_aprobados[i].archivo_adjunto)
              .subscribe(resp => {
                console.log('archivo cargado...');
              },
              (error: any) => {
                Swal.fire({
                  text: 'Ocurrió un problema al cargar el archivo ' + this.archivos_aprobados[i].archivo_adjunto.name,
                  width: 350,
                  padding: 15,
                  timer: 2000,
                  allowOutsideClick: false,
                  showConfirmButton: false,
                  icon: 'error'
                });
                return;
              });
          });
        }          
        
        // Request Object Finalizar Etapa
      this.fetapa.IdProceso = this.proceso_obtenido.IdProceso;
      this.fetapa.IdEtapa = this.proceso_obtenido.Etapa.IdEtapa;
      this.fetapa.ChatarraPeso = Number(this.proceso_obtenido.ProcesoEtapa.VehiculoPeso);
      this.fetapa.VehiculoPeso = Number(this.form_etapa.value.peso_real);
      this.fetapa.FechaInicio = this.obtener_fecha_inicial();
      this.fetapa.FechaFin = this.obtener_fecha_final();
      this.fetapa.Estado = 'T';
      this.fetapa.Checklist = this.checklist_request;

      this._procesoEtapaService.finalizar_etapa(this.fetapa).
      subscribe( resp_fetapa => {
        this.descargar_informe();
        Swal.fire({
          text: 'Verificación Física finalizada',
          width: 350,
          padding: 15,
          timer: 3000,
          allowOutsideClick: false,
          showConfirmButton: false,
          icon: 'success'
        }).then( result => {
          this.volverEtapa();
        });
        
      });

    });

    }   

  }

  obtener_estado_observacion(tipo_observacion: string) {
    this.tipo_observacion = tipo_observacion;

    if(tipo_observacion === 'O') {

        this.form_etapa.get('fecha_fin').clearValidators();
        this.form_etapa.get('hora_fin').clearValidators();
        this.form_etapa.get('peso_estimado').clearValidators();
        this.form_etapa.get('peso_real').clearValidators();

        this.form_etapa.get('fecha_fin').updateValueAndValidity();
        this.form_etapa.get('hora_fin').updateValueAndValidity();
        this.form_etapa.get('peso_estimado').updateValueAndValidity();
        this.form_etapa.get('peso_real').updateValueAndValidity();
    } else {
        this.form_etapa.get('fecha_fin').setValidators([Validators.required]);
        this.form_etapa.get('hora_fin').setValidators([Validators.required]);
        this.form_etapa.get('peso_estimado').setValidators([Validators.required]);
        this.form_etapa.get('peso_real').setValidators([Validators.required]);

        this.form_etapa.get('fecha_fin').updateValueAndValidity();
        this.form_etapa.get('hora_fin').updateValueAndValidity();
        this.form_etapa.get('peso_estimado').updateValueAndValidity();
        this.form_etapa.get('peso_real').updateValueAndValidity();
    }

    if((this.tipo_observacion === 'O') && (this.estado_proceso === 'O')) {
      this.deshabilitar_obs = true;
      this.descripcion_obs = this.proceso_obtenido.ProcesoEtapa.Observacion;
      return;
    }
    this.deshabilitar_obs = false;
    this.descripcion_obs = '';      
}

  volverEtapa(){
    this._router.navigate(['/etapa/verificacion-fisica']);
  }

  obtener_fecha_inicial() {
    const fecha = this.form_etapa.get('fecha_inicio').value;
    const hora = this.form_etapa.get('hora_inicio').value;
    return fecha + 'T' + hora + ':00.015Z'
  }

  obtener_fecha_final() {
    const fecha = this.form_etapa.value.fecha_fin;
    const hora = this.form_etapa.value.hora_fin;
    return fecha + 'T' + hora + ':00.015Z'
  }

  crear_formulario() {
    this.form_etapa = new FormGroup({

      // Datos de la solicitud
      nro_solicitud: new FormControl( null, [Validators.required]),
      fecha_solicitud: new FormControl( null, [Validators.required]),
      pgm_chatarreo: new FormControl( null, [Validators.required]),

      // Verificación Física
      fecha_inicio: new FormControl( null, [Validators.required]),
      hora_inicio: new FormControl( null, [Validators.required]),
      fecha_fin: new FormControl( null, [Validators.required]),
      hora_fin: new FormControl( null, [Validators.required]),
      peso_estimado: new FormControl( null, [Validators.required]),
      peso_real: new FormControl( null, [Validators.required, Validators.pattern('^[1-9][0-9]*$')]),

      // Datos del estado de la etapa
      descripcion_obs: new FormControl(null)
    });
  }

  setear_formulario(proceso: Proceso) {

    this.form_etapa.setValue({
      // Datos de la solicitud
      nro_solicitud: proceso.Correlativo,
      fecha_solicitud: this.convertir_fecha(proceso.FechaFin),
      pgm_chatarreo: proceso.Tipo,

      // Verificación Física
      fecha_inicio: '',
      hora_inicio: '',
      fecha_fin: '',
      hora_fin: '',
      peso_estimado: proceso.ProcesoEtapa.VehiculoPeso,
      peso_real: '',

      // Datos del estado de la etapa
      descripcion_obs: this.descripcion_obs
    })

    if(proceso.Tipo === 'p') {
      this._pchService.getSeleccionar(proceso.IdPch)
      .subscribe((resp: any) =>  {
          /* this.pgm_chatarreo = resp.TipoPCH; */
          this.pgm_chatarreo = resp.TipoPCH;
          console.log(resp.TipoPCH)
      })
    }

    

  }

  deshabilitar_inputs() {
    this.form_etapa.controls['nro_solicitud'].disable();
    this.form_etapa.controls['fecha_solicitud'].disable();
    this.form_etapa.controls['pgm_chatarreo'].disable();

    this.form_etapa.controls['peso_estimado'].disable();
  }

  convertir_fecha(fecha_covertir: string) {
    let fechaFormato = fecha_covertir.split("T",2);
    let fecha = fechaFormato[0];
    return fecha;
  }

  convertir_hora(fecha_covertir: string) {
    let fechaFormato = fecha_covertir.split("T",2);
    let hora = fechaFormato[1];
    return hora;
  }

  obtener_tipo_di(id_tipo_di: string) {

    return id_tipo_di === '01' ? 'DNI' : 'Carnet extranjería';

  }

  obtener_check(check: Checklist) {
    
    /* if(this.checklist_request.length === 0) {
      this.checklist_request.push(check);
      console.log(this.checklist_request);
      return;
    } */
  /* debugger; */
    if(this.checklist_request.length > 0) {
      for(let i = 0; i < this.checklist_request.length; i++) {
      
        if(this.checklist_request[i].IdChecklist === check.IdChecklist) {
          this.checklist_request.splice(i, 1); 
          console.log(this.checklist_request);
          return;
        }
      }
    }    
    
    check.Cumple = 'S';
    this.checklist_request.push(check);   
    console.log(this.checklist_request);   

  }

  descargar_informe() {

    let id_etapa = this.proceso_obtenido.Etapa.IdEtapa;
    let id_proceso = this.proceso_obtenido.IdProceso;
    let token = this.proceso_token;

    this._procesoEtapaService.descargar_informe(id_etapa, encodeURIComponent(token)).
    subscribe(resp => {
    
      const blob_data = new Blob([resp], { type: 'application/pdf' });
      const blob = new Blob([blob_data], { type: 'application/pdf' }); 
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.download = 'verificacion_fisica_nro_'+ id_proceso +'.pdf';
      anchor.href = url;
      anchor.click();
    },
    (error) => {
      console.error(error);
      Swal.fire({
        text: 'Error al descargar informe. Intente nuevamente.',
        width: 350,
        padding: 15,
        timer: 2000,
        allowOutsideClick: false,
        showConfirmButton: false,
        icon: 'error'
      });
    }
    
    );
  }

  quitarImagen(idxImg: number){
    for(let i=0; i<this.archivos_etapa.length; i++){
      if(this.archivos_etapa[i].Subtipo === "E" && this.archivos_etapa[i].IdTipoArchivo === (idxImg + 1)){
        this.archivos_etapa[i].archivo_adjunto = null;
        this.items[idxImg].data.src = "../../../assets/img/image_default.png";
        this.items[idxImg].data.thumb = "../../../assets/img/image_default.png";
        this.mostrar_boton_add_img = true;

        break;
      }
    }
  }

  setImagenes(){
    for(let i=0; i<this.archivos_etapa.length; i++){
      if(this.archivos_etapa[i].Subtipo === "E"){
        const urlImg = this.archivos_etapa[i].Token ? "../../../assets/img/image_default.png" : "../../../assets/img/image_default.png";
        this.items.push(new ImageItem({ src: urlImg, thumb: urlImg }));
      }
    }

    this.mostrarBotonAgregarImg();
  }

  previewImage(uplImg: ArchivoEtapa){
    var idx: number = 0;
    var reader = new FileReader();

    for(let i=0; i<this.items.length; i++){
      var src: string = this.items[i].data.src as string;
      if(src.endsWith('image_default.png')){
        idx = i;
        break;
      }
    }
    
    reader.onloadend = () => {
      this.items[idx].data.src = reader.result;
      this.items[idx].data.thumb = reader.result;

      this.mostrarBotonAgregarImg();
    }

    reader.readAsDataURL(uplImg.archivo_adjunto);
  }

  mostrarBotonAgregarImg(){
    this.mostrar_boton_add_img = false;
    for(let i=0; i<this.items.length; i++){
      var src: string = this.items[i].data.src as string;
      if(src.endsWith('image_default.png')){
        this.mostrar_boton_add_img = true;

        break;
      }
    }
  }

  adjuntar_imagen(){
    var idx: number = 0;
    
    for(let i=0; i<this.items.length; i++){
      var src: string = this.items[i].data.src as string;
      if(src.endsWith('image_default.png')){
        idx = i;
        break;
      }
    }

    for(let i=0; i<this.archivos_etapa.length; i++){
      if(this.archivos_etapa[i].Subtipo === "E"){
        if(this.archivos_etapa[i].IdTipoArchivo === (idx + 1)){
          this._archivoService.obtener_archivo_evaluar(this.archivos_etapa[i]);

          const dialogRef = this._dialog.open(ArchivoAdjuntarComponent, {
              width: '700px'
          });

          break;
        }
      }
    }
  }

  basicLightboxExample() {
    this.gallery.ref().load(this.items);
  }

  withCustomGalleryConfig() {

    // 2. Get a lightbox gallery ref
    const lightboxGalleryRef = this.gallery.ref('anotherLightbox');

    // (Optional) Set custom gallery config to this lightbox
    lightboxGalleryRef.setConfig({
      imageSize: ImageSize.Cover,
      thumbPosition: ThumbnailsPosition.Top
    });

    // 3. Load the items into the lightbox
    lightboxGalleryRef.load(this.items);
  }
}