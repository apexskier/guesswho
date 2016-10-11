declare type userID = string;

declare interface UserInfo {
    name: string;
    id: userID;
    picture?: {
        data: {
            is_silhouette: boolean;
            url: string;
        };
    };
}

interface Array<T> {
    find(predicate: (search: T) => boolean): T;
}

interface Object {
    /**
    * Copy the values of all of the enumerable own properties from one or more source objects to a
    * target object. Returns the target object.
    * @param target The target object to copy to.
    * @param sources One or more source objects to copy properties from.
    */
    assign(target: any, ...sources: any[]): any;
}
