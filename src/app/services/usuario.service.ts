import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { URL_SERVICIOS, ID_ROL } from 'app/config/config';

import { Usuario } from '../models/usuario.model';
import { UsuarioLogueado } from '../models/usuarioLogueado.model';
import { UsuarioRequest } from '../models/usuarioRequest.model';

import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  usuario: UsuarioLogueado;
  token: string;
  loading: boolean;

  constructor(
    private _http: HttpClient,
    private _router: Router
    ) {
    this.loading = false;
    this.cargarStorage();
   }

  limpiarAcceso() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.token = '';
    this.usuario = null;
  }

  cargarStorage() {

    if (localStorage.getItem('token'))  {
      this.token = localStorage.getItem('token');
      this.usuario = JSON.parse( localStorage.getItem('usuario') );
    } else {
      this.limpiarAcceso();
    }
  }

  guardarStorage( token: string, usuario: UsuarioLogueado ) {

    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));

    this.usuario = usuario;
    this.token = token;

  }

  cerrar_sesion() {
    this.limpiarAcceso();
    this._router.navigate(['/login']);
  }

  getMantenimientoQuery( query: string ) {
    const url = `${ URL_SERVICIOS }api/mantenimiento/usuario?${ query }`;
    const headers = new HttpHeaders({
      'x-api-key': this.token
    });

    return this._http.get(url, { headers });
  }

  getUsuarios(tipo : string, estado: string){
    return this.getMantenimientoQuery( `tipo=${tipo}&estado=${estado}` );
  }

  modificarUsuario(usu: UsuarioRequest){
    const url = `${ URL_SERVICIOS }api/mantenimiento/usuario`;
    const headers = new HttpHeaders({
      'x-api-key': this.token
    });

    return this._http.put(url, usu, { headers });
  }

  login(usuario: Usuario, recordar: boolean = false){

    this.loading = true;
    if (recordar) {
      localStorage.setItem( 'nomusuario_recuerda', usuario.Usuario );
      localStorage.setItem( 'contrasena_recuerda', usuario.Contrasenia );
    } else {
      localStorage.removeItem( 'nomusuario_recuerda' );
      localStorage.removeItem( 'contrasena_recuerda' );
    }
    
    let url: string;
    url = `${ URL_SERVICIOS }api/usuario?usuario=${ usuario.Usuario }&contrasenia=${ usuario.Contrasenia }&idPerfilSso=${ ID_ROL }`;

    return this._http.get(url).pipe(
      map( (resp: UsuarioLogueado) => {
        this.guardarStorage( resp.AccessToken, resp);
        this.usuario = resp;
        console.log(this.usuario);
        this.loading = false;
        this._router.navigate(['/']);
        return true;
      }),
      catchError(err => {
        this.loading = false;
        Swal.fire({
          text: err.error,
          width: 350,
          padding: 15,
          timer: 2000,
          allowOutsideClick: false,
          showConfirmButton: false,
          icon: 'error'
        });

        return throwError(err);

      })
    );
  }

}
