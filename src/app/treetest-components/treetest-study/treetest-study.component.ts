import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';

import { UserService } from '../../user.service';

declare var $: any;

@Component({
  selector: 'app-test',
  templateUrl: './treetest-study.component.html',
  styleUrls: ['./treetest-study.component.css', '../../app.component.css']
})
export class TreetestStudyComponent implements OnDestroy, OnInit {


  taskIndex = 0;
  tests = [];
  test = {
    clicks: [],
    answer: {},
    time: null
  };
  startTime;
  endTime;
  doingTask = false;
  enterPassword = '';
  studyPassword = '';
  study;
  password = false;
  finished = false;
  selectedAnswer = false;
  // tslint:disable-next-line:no-string-literal
  id = this.route.snapshot.params['id'];
  intro = true;
  showTree = false;
  userName = "";
  feedback = "";
  feedbackDone = false;

  public isPreview = false;

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router, private userService: UserService) { 
    this.isPreview = this.route.snapshot.url[0].path.indexOf('preview') > - 1;
    var date = (new Date()).toISOString().slice(0, 19).replace(/-/g, "-").replace("T", " ");
  }

  getTestData() {
    /*const header = new Headers({ Authorization: 'Bearer ' + (JSON.parse(localStorage.getItem('currentUser'))).token});*/
    const httpOptions = {
        headers: new HttpHeaders({
        'Content-Type':  'application/json',
          Authorization: 'Bearer ' + (JSON.parse(localStorage.getItem('currentUser'))).token
      })
  };
    return this.http.post(this.userService.serverUrl +  '/users/tree-tests/' + this.id, "", httpOptions);
  }

  ngOnDestroy() {
    
    if (this.isPreview) {
      return;
    }

    if (!this.finished) {
      //add results in database
      const test = {
        id: this.id,
        tests: this.tests,
        finished: false,
        username: this.userName,
        timestamp: (new Date()).toISOString().slice(0, 19).replace(/-/g, "-").replace("T", " "),
        feedback: ""
      };

      this.postTestData(test)
      .subscribe(
        res => {
          console.log(res);
        },
        err => {
          console.log(err);
        }
      );
    }
  }

  ngOnInit() {
    $('[data-toggle="tooltip"]').tooltip();
    this.getTestData()
    .subscribe(
      res => {
        console.log(res);
      },
      err => {
        console.log(err);
      }
    );

    if (localStorage.getItem('jstree')) {
      localStorage.removeItem('jstree');
    }
    const body = {
      id: this.id
    };
    this.passwordRequired(body)
      .subscribe(
        res => {
          console.log(res);

          if (res === 'redirect' && !this.isPreview) {
            console.log('redirect');
            this.router.navigate(['study-closed']);
          } else {
            console.log('NO REDIRECT');
          }
          if (res) {
            this.password = true;
          } else {
            this.password = false;
            this.preparePassword();
          }
        },
        err => {
          console.log(err);
          this.password = false;
        }
      );
  }

  sendFeedback() {
    if (this.isPreview) {
      return;
    }
    const test = {
      username: this.userName,
      feedback: this.feedback
    };

    this.postFeedback(test)
    .subscribe(
      res => {
        console.log(res);
        this.feedbackDone = true;
      },
      err => {
        this.feedbackDone = true;
        console.log(err);
      }
    );
  }

  submitFinalAnswer(index, skipped) {

    const instance = $('#study-tree').jstree(true);
    if (skipped) {
      this.test['answer'] = null;
    } else {
    // tslint:disable-next-line:no-string-literal
      this.test['answer'] = (instance.get_selected())[0];
    }
    this.endTime = new Date();
    const timeDiff = (this.endTime - this.startTime) / 1000; // in seconds
    // tslint:disable-next-line:no-string-literal
    this.test['time'] = timeDiff;
    this.startTime = undefined;
    this.endTime = undefined;
    this.tests.push(this.test);
    this.test =  {
      clicks: [],
      answer: {},
      time: null
    };
    $(".jstree").jstree('close_all');
    $('.jstree').jstree('open_node', '#root');
    //$("#study-tree").jstree("close_all", -1);
    this.taskIndex++;
    if (localStorage.getItem('jstree')) {
      localStorage.removeItem('jstree');
    }
    if (this.taskIndex >= this.study.tasks.length) {
      this.finished = true;

      if (!this.isPreview) {      
        //add results in database
        const test = {
          id: this.id,
          tests: this.tests,
          finished: true,
          username: this.userName,
          timestamp: (new Date()).toISOString().slice(0, 19).replace(/-/g, "-").replace("T", " "),
          feedback: ""
        };

        this.postTestData(test)
        .subscribe(
          res => {
            console.log(res);
          },
          err => {
            console.log(err);
          }
        );
      }
    }
    this.doingTask = false;
    this.selectedAnswer = false;

  }

  startTask(index) {
    this.showTree = false;
    this.doingTask = false;
    this.startTime = new Date();
    this.createTree('study-tree', (this.study).tree);
    setTimeout(() => {
      if (!this.taskIndex) {
        // tslint:disable-next-line:only-arrow-functions
        $('#study-tree').on('select_node.jstree', (e, data) => {
          if (!data.node.children.length) {
            this.selectedAnswer = true;
          } else {
            if (!this.study.leafNodes) {
              this.selectedAnswer = true;
            } else {
              this.selectedAnswer = false;
            }
            $("#study-tree").jstree("open_node", $("#" + data.node.id));
            var obj =  data.instance.get_node(data.node, true);
            if(obj) {
              obj.siblings('.jstree-open').each(function () { data.instance.close_node($('#study-tree'), 0); }); 
            }
          }
        });
        $("#study-tree").bind("open_node.jstree", (event, data) => { 
          if (data.node.id !== 'root') {
            this.test['clicks'].push(data.node);
          }
          var obj =  data.instance.get_node(data.node, true);
          
          if (obj) {
            obj.siblings('.jstree-open').each(function () {       data.instance.close_node(this, 0); 
            data.instance.close_all(this, 0); 
            }); 
          }
        });
      }
    }, 500);
  }

  createTree(id, content) {
    $('#' + id).jstree({
      core : {
        expand_selected_onload : false,
        animation : 0,
        check_callback : function test(op, node, par, pos, more) {
          console.log('here!!!');
        },
        themes : { icons: false  },
        data : content
      },
      types : {
        root : {
          icon : '/static/3.3.7/assets/images/tree_icon.png',
          valid_children : ['default']
        },
        default : {
          valid_children : ['default', 'file']
        },
        file : {
          icon : 'glyphicon glyphicon-file',
          valid_children : []
        }
      },
      plugins : [
        'contextmenu', 'dnd', 'search',
        'state', 'types', 'wholerow'
      ]
    });
    setTimeout(() => {
      $('#' + id).jstree("close_all");
      $('#' + id).jstree('open_node', '#root');
      this.doingTask = true;
    }, 500);
  }

  passwordRequired(id) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
        Authorization: 'Bearer ' + (JSON.parse(localStorage.getItem('currentUser'))).token
      })
  };
    return this.http.post(this.userService.serverUrl + '/users/tree-study/passwordrequired', id, httpOptions);
  }

  testInformation(id) {
    const header = new Headers({ Authorization: 'Bearer ' + (JSON.parse(localStorage.getItem('currentUser'))).token});
    const httpOptions = {
        headers: new HttpHeaders({
        'Content-Type':  'application/json',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
        Authorization: 'Bearer ' + (JSON.parse(localStorage.getItem('currentUser'))).token
      })
  };
    return this.http.post(this.userService.serverUrl + '/users/tree-study/get', id, httpOptions);
  }

  preparePassword() {
    const body = {
      id: this.id,
      password: this.enterPassword
    };
    this.sendPassword(body)
      .subscribe(
        res => {
          console.log(res);
          if (!res) {
            alert('Wrong password!');
          } else {
            this.study = res;
          }
        },
        err => {
          console.log('ERR');
          console.log(err);
          alert('Wrong password!');
        }
      );
  }

  sendPassword(body) {
    const httpOptions = {
        headers: new HttpHeaders({
        'Content-Type':  'application/json',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
          Authorization: 'Bearer ' + (JSON.parse(localStorage.getItem('currentUser'))).token
      })
  };
    return this.http.post(this.userService.serverUrl + '/users/tree-study/password', body, httpOptions);
  }

  postTestData(object) {
    const httpOptions = {
        headers: new HttpHeaders({
        'Content-Type':  'application/json',
          Authorization: 'Bearer ' + (JSON.parse(localStorage.getItem('currentUser'))).token
      })
    };
    return this.http.post(this.userService.serverUrl + '/users/tree-tests/add', object, httpOptions);
  }

  postFeedback(object) {
    const httpOptions = {
        headers: new HttpHeaders({
        'Content-Type':  'application/json',
          Authorization: 'Bearer ' + (JSON.parse(localStorage.getItem('currentUser'))).token
      })
    };
    return this.http.post(this.userService.serverUrl + '/users/tree-tests/feedback', object, httpOptions);
  }

}
